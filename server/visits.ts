import { clsUnit, paidAmount } from '../src/store/billing.js'
import { serviceById } from '../src/store/catalog.js'
import { addMinutesToTime } from '../src/lib/date.js'
import { RUNTIME, runtimeCode } from '../src/store/runtime.js'
import type {
  ParaclinicalOrderItem, Patient, PaymentMethod, PaymentRecord, PaymentStatus, Visit, VisitCategory, VisitInput, VisitSource, VisitStatus,
} from '../src/store/types.js'
import { nextQueue, nextReceiptCode } from './codes.js'
import { ApiError } from './errors.js'
import { patientService } from './patients.js'
import type { Repos } from './repo.js'
import { matchesPatient, normalize } from './search.js'
import { isISODate, todayVN } from './time.js'

const STATUSES: VisitStatus[] = ['registered', 'waiting', 'in_progress', 'done', 'cancelled']
const PAYMENT_STATUSES: PaymentStatus[] = ['none', 'paid', 'unpaid', 'partial', 'cancelled', 'refunded', 'failed']
const CATEGORIES: VisitCategory[] = ['booked', 'walk_in', 'referral']
const SOURCES: VisitSource[] = ['direct', 'website', 'app', 'zalo', 'hotline', 'referral']
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'ewallet']

/**
 * Luồng trạng thái của 1.0: Đã đăng ký → Chờ khám → Đang khám → Đã khám.
 * Huỷ đi đường riêng (POST …/cancel) vì cần lý do và có thể hoàn tiền.
 */
export const NEXT_STATUS: Partial<Record<VisitStatus, VisitStatus>> = {
  registered: 'waiting',
  waiting: 'in_progress',
  in_progress: 'done',
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const isDate = isISODate
const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
const money = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0

/** Kiểm tra dữ liệu đăng ký lượt khám (các trường như VisitInput của 1.0) */
function parseVisitInput(raw: unknown): VisitInput {
  if (!isObject(raw)) throw new ApiError('bad_request', 'Thiếu thông tin lượt khám (visit)')
  const e: Record<string, string> = {}
  if (!isDate(raw.date)) e.date = 'Ngày khám không hợp lệ (YYYY-MM-DD)'
  if (!isTime(raw.time)) e.time = 'Giờ khám không hợp lệ (HH:mm)'
  if (raw.endTime !== undefined && raw.endTime !== '' && !isTime(raw.endTime)) e.endTime = 'Giờ kết thúc không hợp lệ (HH:mm)'
  for (const k of ['doctorId', 'roomId', 'serviceId'] as const) if (typeof raw[k] !== 'string' || !raw[k]) e[k] = 'Bắt buộc'
  if (!CATEGORIES.includes(raw.category as VisitCategory)) e.category = 'Phân loại không hợp lệ'
  if (!SOURCES.includes(raw.source as VisitSource)) e.source = 'Nguồn không hợp lệ'
  if (!money(raw.fee)) e.fee = 'Phí phải là số không âm'
  if (raw.consultationFee !== undefined && !money(raw.consultationFee)) e.consultationFee = 'Công khám phải là số không âm'
  if (raw.paidAmountNow !== undefined && !money(raw.paidAmountNow)) e.paidAmountNow = 'Số tiền thu phải là số không âm'
  if (raw.payNow && !METHODS.includes(raw.payMethod as PaymentMethod)) e.payMethod = 'Hình thức thanh toán không hợp lệ'
  if (raw.initialStatus !== undefined && !['registered', 'waiting', 'in_progress'].includes(raw.initialStatus as string)) e.initialStatus = 'Chỉ được Đã đăng ký / Chờ khám / Đang khám'
  const orders = raw.paraclinicalOrders ?? []
  if (!Array.isArray(orders) || orders.some((o) => !isObject(o) || typeof o.id !== 'string' || !money(o.unitPrice) || typeof o.quantity !== 'number' || o.quantity < 1)) {
    e.paraclinicalOrders = 'Danh sách chỉ định không hợp lệ'
  }
  if (Object.keys(e).length) throw new ApiError('validation', 'Dữ liệu lượt khám chưa hợp lệ', e)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    date: raw.date as string,
    time: raw.time as string,
    endTime: str(raw.endTime) || undefined,
    serviceId: raw.serviceId as string,
    consultationFee: raw.consultationFee as number | undefined,
    paraclinicalOrders: orders as ParaclinicalOrderItem[],
    fee: raw.fee as number,
    doctorId: raw.doctorId as string,
    roomId: raw.roomId as string,
    category: raw.category as VisitCategory,
    source: raw.source as VisitSource,
    reason: str(raw.reason),
    symptoms: str(raw.symptoms) || undefined,
    note: str(raw.note),
    vitals: isObject(raw.vitals) ? (raw.vitals as VisitInput['vitals']) : undefined,
    visitKind: raw.visitKind === 'Cận lâm sàng' ? 'Cận lâm sàng' : 'Lịch khám',
    initialStatus: raw.initialStatus as VisitStatus | undefined,
    checkInNow: raw.checkInNow === true,
    payNow: raw.payNow === true,
    paidAmountNow: raw.paidAmountNow as number | undefined,
    payMethod: (raw.payMethod as PaymentMethod) ?? 'cash',
  }
}

/** Dựng lượt khám mới — giống buildVisit trong src/store/storeLogic.ts của 1.0 (phí, phiếu thu lúc tiếp nhận, trạng thái) */
export function buildVisit(
  args: { patientId: string; input: VisitInput; patientType: Visit['patientType']; queue: number; receiptCode?: string; now: string; cashier: string },
): Visit {
  const { input, now } = args
  const clsTotal = (input.paraclinicalOrders ?? []).reduce((s, item) => s + item.unitPrice * item.quantity, 0)
  const ck = input.consultationFee ?? Math.max(input.fee - clsTotal, 0)
  const totalFee = ck + clsTotal
  const payAmt = input.payNow ? (input.paidAmountNow ?? totalFee) : 0
  const payments: PaymentRecord[] =
    input.payNow && (payAmt > 0 || totalFee === 0)
      ? [
          {
            id: uid('pay'),
            kind: 'payment',
            amount: payAmt,
            method: input.payMethod,
            at: now,
            code: args.receiptCode,
            cashier: args.cashier,
            lines:
              payAmt >= totalFee
                ? [
                    ...(ck > 0 ? [{ kind: 'consultation' as const, refId: 'ck', name: serviceById(input.serviceId)?.name ?? 'Công khám', unit: 'Lần', quantity: 1, unitPrice: ck, discount: 0 }] : []),
                    ...(input.paraclinicalOrders ?? []).map((o) => ({ kind: 'paraclinical' as const, refId: o.id, name: o.name, unit: clsUnit(o.serviceId), quantity: o.quantity, unitPrice: o.unitPrice, discount: 0 })),
                  ]
                : undefined,
          },
        ]
      : []
  const status: VisitStatus = input.initialStatus ?? (input.checkInNow ? 'waiting' : 'registered')
  const paymentStatus: PaymentStatus = input.payNow
    ? totalFee === 0 || payAmt >= totalFee ? 'paid' : payAmt > 0 ? 'partial' : 'unpaid'
    : totalFee === 0 ? 'none' : 'unpaid'

  return {
    id: uid('v'),
    code: runtimeCode(input.date, args.queue),
    patientId: args.patientId,
    queueNumber: args.queue,
    date: input.date,
    time: input.time,
    endTime: input.endTime || addMinutesToTime(input.time, 30),
    doctorId: input.doctorId,
    roomId: input.roomId,
    serviceId: input.serviceId,
    consultationFee: ck,
    medicationFee: 0,
    paraclinicalOrders: input.paraclinicalOrders ?? [],
    fee: totalFee,
    payments,
    paymentStatus,
    status,
    patientType: args.patientType,
    visitKind: input.visitKind ?? 'Lịch khám',
    category: input.category,
    source: input.source,
    reason: input.reason.trim(),
    symptoms: input.symptoms?.trim() ?? '',
    note: input.note.trim(),
    vitals: input.vitals,
    createdAt: now,
    checkedInAt: status === 'waiting' || status === 'in_progress' ? now : undefined,
    startedAt: status === 'in_progress' ? now : undefined,
  }
}

export interface VisitListParams {
  dateFrom?: string
  dateTo?: string
  status?: string
  paymentStatus?: string
  patientId?: string
  q?: string
}

export function visitService(repos: Repos, opts: { cashier?: string; clock?: () => Date } = {}) {
  const clock = opts.clock ?? (() => new Date())
  const cashier = opts.cashier ?? RUNTIME.userName

  const mustGet = async (id: string) => {
    const v = await repos.visits.get(id)
    if (!v) throw new ApiError('not_found', 'Không tìm thấy lượt khám')
    return v
  }

  return {
    async list(params: VisitListParams) {
      const today = todayVN(clock())
      const dateFrom = params.dateFrom || today
      const dateTo = params.dateTo || dateFrom
      if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) throw new ApiError('validation', 'Khoảng ngày không hợp lệ', { dateFrom: 'YYYY-MM-DD, từ ngày ≤ đến ngày' })
      if (params.status && !STATUSES.includes(params.status as VisitStatus)) throw new ApiError('validation', 'Trạng thái không hợp lệ', { status: STATUSES.join(' | ') })
      if (params.paymentStatus && !PAYMENT_STATUSES.includes(params.paymentStatus as PaymentStatus)) {
        throw new ApiError('validation', 'Trạng thái thanh toán không hợp lệ', { paymentStatus: PAYMENT_STATUSES.join(' | ') })
      }
      const visits = await repos.visits.list({
        dateFrom, dateTo, status: params.status as VisitStatus | undefined, paymentStatus: params.paymentStatus as PaymentStatus | undefined, patientId: params.patientId,
      })
      const patients = new Map((await repos.patients.getMany([...new Set(visits.map((v) => v.patientId))])).map((p) => [p.id, p]))
      const q = params.q?.trim()
      const rows = visits
        .map((visit) => ({ visit, patient: patients.get(visit.patientId) }))
        .filter((r): r is { visit: Visit; patient: Patient } => !!r.patient)
        .filter((r) => !q || matchesPatient(r.patient, q) || normalize(`${r.visit.code} ${r.patient.guardianName ?? ''}`).includes(normalize(q)))
        // Như 1.0: ngày mới nhất trước, trong ngày theo STT
        .sort((a, b) => b.visit.date.localeCompare(a.visit.date) || a.visit.queueNumber - b.visit.queueNumber)
      return { items: rows, total: rows.length }
    },

    get: mustGet,

    /**
     * Đăng ký lượt khám.
     * - Bệnh cũ: { patientId, visit, patientPatch? }
     * - Bệnh mới: { patient: {...hồ sơ}, visit } → tạo hồ sơ (cấp mã BN) rồi tạo lượt khám
     */
    async register(body: unknown) {
      if (!isObject(body)) throw new ApiError('bad_request', 'Dữ liệu gửi lên phải là một đối tượng JSON')
      const input = parseVisitInput(body.visit)
      const patients = patientService(repos)
      let patient: Patient
      let patientType: Visit['patientType']
      if (typeof body.patientId === 'string' && body.patientId) {
        patient = body.patientPatch !== undefined ? await patients.update(body.patientId, body.patientPatch) : await patients.get(body.patientId)
        patientType = 'returning'
      } else if (isObject(body.patient)) {
        patient = await patients.create(body.patient)
        patientType = 'new'
      } else {
        throw new ApiError('bad_request', 'Cần patientId (bệnh cũ) hoặc patient (bệnh mới)')
      }
      const now = clock().toISOString()
      const queue = await nextQueue(repos, input.date)
      // Cùng công thức với buildVisit, để chỉ lấy số phiếu khi thật sự tạo phiếu thu (không nhảy số)
      const clsTotal = (input.paraclinicalOrders ?? []).reduce((s, o) => s + o.unitPrice * o.quantity, 0)
      const totalFee = (input.consultationFee ?? Math.max(input.fee - clsTotal, 0)) + clsTotal
      const payAmt = input.payNow ? (input.paidAmountNow ?? totalFee) : 0
      const receiptCode = input.payNow && (payAmt > 0 || totalFee === 0) ? await nextReceiptCode(repos, todayVN(clock())) : undefined
      const visit = await repos.visits.insert(buildVisit({ patientId: patient.id, input, patientType, queue, receiptCode, now, cashier }))
      return { patient, visit }
    },

    /** Chuyển sang bước tiếp theo của luồng (không nhảy cóc, không quay lui) */
    async setStatus(id: string, body: unknown) {
      const to = isObject(body) ? body.status : undefined
      if (!STATUSES.includes(to as VisitStatus)) throw new ApiError('validation', 'Trạng thái không hợp lệ', { status: STATUSES.join(' | ') })
      if (to === 'cancelled') throw new ApiError('bad_request', 'Huỷ lượt khám dùng POST /api/visits/:id/cancel (cần lý do)')
      const visit = await mustGet(id)
      if (NEXT_STATUS[visit.status] !== to) {
        throw new ApiError('conflict', `Không thể chuyển từ "${visit.status}" sang "${String(to)}"`, { status: `Bước tiếp theo hợp lệ: ${NEXT_STATUS[visit.status] ?? 'không có'}` })
      }
      const now = clock().toISOString()
      const patch: Partial<Visit> = { status: to as VisitStatus }
      if (to === 'waiting') patch.checkedInAt = now
      if (to === 'in_progress') patch.startedAt = now
      if (to === 'done') patch.finishedAt = now
      return (await repos.visits.update(id, patch))!
    },

    /** Huỷ lượt khám — giống cancelVisit của 1.0: có lý do, tuỳ chọn hoàn số đã thu, huỷ chỉ định chưa làm */
    async cancel(id: string, body: unknown) {
      const b = isObject(body) ? body : {}
      const reason = typeof b.reason === 'string' ? b.reason.trim() : ''
      if (!reason) throw new ApiError('validation', 'Nhập lý do huỷ', { reason: 'Bắt buộc' })
      const refund = b.refund === true
      const refundMethod = (b.refundMethod as PaymentMethod) ?? 'cash'
      if (refund && !METHODS.includes(refundMethod)) throw new ApiError('validation', 'Hình thức hoàn tiền không hợp lệ', { refundMethod: METHODS.join(' | ') })
      const visit = await mustGet(id)
      if (visit.status === 'done' || visit.status === 'cancelled') throw new ApiError('conflict', 'Lượt khám đã khám xong hoặc đã huỷ, không thể huỷ')
      const paid = paidAmount(visit)
      const payments =
        refund && paid > 0
          ? [...visit.payments, { id: uid('pay'), kind: 'refund' as const, amount: paid, method: refundMethod, at: clock().toISOString(), note: 'Hoàn tiền do huỷ lượt khám', cashier }]
          : visit.payments
      return (await repos.visits.update(id, {
        status: 'cancelled',
        cancelReason: reason,
        payments,
        paraclinicalOrders: (visit.paraclinicalOrders ?? []).map((o) =>
          o.resultStatus === 'has_result' || o.performStatus === 'done' ? o : { ...o, performStatus: 'cancelled' as const },
        ),
        paymentStatus: refund && paid > 0 ? 'refunded' : paid > 0 ? visit.paymentStatus : visit.fee === 0 ? 'none' : 'cancelled',
      }))!
    },
  }
}
