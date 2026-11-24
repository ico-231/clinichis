import { clsCharge, derivePaymentStatus, isLinePaid } from '../src/store/billing.js'
import { providerById } from '../src/store/paraclinicalCatalog.js'
import { orderableClsServices } from './catalog.js'
import { RUNTIME } from '../src/store/runtime.js'
import type {
  Diagnosis, ExamRecord, ParaclinicalOrderItem, ParaclinicalResult, PerformStatus, PrescriptionItem, ResultFile, Visit, VitalSigns,
} from '../src/store/types.js'
import { ApiError } from './errors.js'
import type { Repos } from './repo.js'
import { todayVN } from './time.js'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const VITAL_KEYS = ['heightCm', 'weightKg', 'temperatureC', 'bpSystolic', 'bpDiastolic', 'pulse', 'respiratoryRate', 'spo2'] as const
const PERFORM: PerformStatus[] = ['pending', 'in_progress', 'done', 'cancelled', 'no_show']
/** Giới hạn tệp kết quả lưu kèm (bản demo lưu data URL trong jsonb; bản thật nên chuyển sang Supabase Storage) */
const MAX_FILES_BYTES = 2_000_000

/** BMI = cân nặng / (chiều cao m)² — như computeBmi của màn khám 1.0 */
export function computeBmi(heightCm: string, weightKg: string) {
  const h = Number(heightCm.replace(',', '.')) / 100
  const w = Number(weightKg.replace(',', '.'))
  if (!h || !w) return ''
  return (w / (h * h)).toFixed(1)
}

/** Tổng số lượng thuốc = số ngày × tổng liều trong ngày (làm tròn lên) */
export const computeQuantity = (i: Pick<PrescriptionItem, 'days' | 'morning' | 'noon' | 'afternoon' | 'evening'>) => Math.ceil(i.days * (i.morning + i.noon + i.afternoon + i.evening))

function parseVitals(raw: unknown, e: Record<string, string>): VitalSigns {
  if (!isObject(raw)) {
    e.vitals = 'Phải là đối tượng'
    return {}
  }
  const out: VitalSigns = {}
  for (const k of VITAL_KEYS) {
    const v = raw[k]
    if (v === undefined || v === null || v === '') continue
    const s = String(v).trim()
    if (!/^\d+([.,]\d+)?$/.test(s)) e[`vitals.${k}`] = 'Phải là số'
    else out[k] = s
  }
  if (out.heightCm && out.weightKg) out.bmi = computeBmi(out.heightCm, out.weightKg)
  return out
}

function parseDiagnoses(raw: unknown, e: Record<string, string>): Diagnosis[] {
  if (!Array.isArray(raw)) {
    e.diagnoses = 'Phải là danh sách'
    return []
  }
  return raw.flatMap((d, i) => {
    if (!isObject(d) || (!str(d.code) && !str(d.name))) {
      e[`diagnoses.${i}`] = 'Cần mã ICD-10 hoặc tên chẩn đoán'
      return []
    }
    return [{ code: str(d.code).toUpperCase(), name: str(d.name) }]
  })
}

function parsePrescription(raw: unknown, e: Record<string, string>): PrescriptionItem[] {
  if (!Array.isArray(raw)) {
    e.prescription = 'Phải là danh sách'
    return []
  }
  return raw.flatMap((it, i) => {
    const p = `prescription.${i}`
    if (!isObject(it) || !str(it.name)) {
      e[p] = 'Thiếu tên thuốc'
      return []
    }
    const num = (k: string) => (typeof it[k] === 'number' ? (it[k] as number) : Number.NaN)
    const days = num('days')
    const doses = (['morning', 'noon', 'afternoon', 'evening'] as const).map((k) => (it[k] === undefined ? 0 : num(k)))
    if (!Number.isInteger(days) || days < 1) e[`${p}.days`] = 'Số ngày phải là số nguyên ≥ 1'
    if (doses.some((d) => !Number.isFinite(d) || d < 0)) e[`${p}.dose`] = 'Liều dùng không hợp lệ'
    else if (doses.every((d) => d === 0)) e[`${p}.dose`] = 'Nhập liều ít nhất một buổi'
    const [morning, noon, afternoon, evening] = doses
    const auto = Number.isInteger(days) && days >= 1 && doses.every(Number.isFinite) ? computeQuantity({ days, morning, noon, afternoon, evening }) : 0
    const quantity = it.quantity === undefined ? auto : num('quantity')
    if (!Number.isFinite(quantity) || quantity <= 0) e[`${p}.quantity`] = 'Số lượng phải > 0'
    return [{
      id: str(it.id) || uid('rx'), drugId: str(it.drugId), name: str(it.name), activeIngredient: str(it.activeIngredient), strength: str(it.strength),
      days, doseUnit: str(it.doseUnit) || 'Viên', morning, noon, afternoon, evening, quantity, quantityUnit: str(it.quantityUnit) || str(it.doseUnit) || 'Viên', usage: str(it.usage),
    }]
  })
}

/** Tính lại tổng phí (CK + CLS tính phí + thuốc) và trạng thái thanh toán — như saveExam / updateOrder của 1.0 */
function withFees(visit: Visit, patch: Partial<Visit>): Partial<Visit> {
  const merged = { ...visit, ...patch }
  const fee = (merged.consultationFee ?? 0) + clsCharge(merged.paraclinicalOrders, merged.payments) + (merged.medicationFee ?? 0)
  const paymentStatus = merged.status === 'cancelled' ? merged.paymentStatus : derivePaymentStatus({ payments: merged.payments, fee }, merged.paymentStatus)
  return { ...patch, fee, paymentStatus }
}

/** Lý do không được bỏ / sửa số lượng chỉ định (null = được) — như lockedOrders của màn khám 1.0 */
export function orderLock(visit: Visit, o: ParaclinicalOrderItem): string | null {
  if (isLinePaid(visit, { kind: 'paraclinical', refId: o.id })) return 'Đã thu tiền – cần hoàn tiền trước khi bỏ'
  if (o.resultStatus === 'has_result') return 'Đã có kết quả'
  if (o.performStatus === 'in_progress' || o.performStatus === 'done') return 'Phòng CLS đang / đã thực hiện'
  return null
}

function parseFiles(raw: unknown, key: string, e: Record<string, string>, at: string): ResultFile[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    e[key] = 'Phải là danh sách'
    return []
  }
  return raw.flatMap((f, i) => {
    if (!isObject(f) || !str(f.name) || typeof f.dataUrl !== 'string' || !f.dataUrl.startsWith('data:')) {
      e[`${key}.${i}`] = 'Tệp cần name và dataUrl (data:…)'
      return []
    }
    return [{ id: str(f.id) || uid('file'), name: str(f.name), type: str(f.type) || 'application/octet-stream', size: typeof f.size === 'number' ? f.size : f.dataUrl.length, dataUrl: f.dataUrl, at: str(f.at) || at }]
  })
}

export function examService(repos: Repos, opts: { doctor?: string; clock?: () => Date } = {}) {
  const clock = opts.clock ?? (() => new Date())
  const by = opts.doctor ?? RUNTIME.userName

  const mustGet = async (id: string) => {
    const v = await repos.visits.get(id)
    if (!v) throw new ApiError('not_found', 'Không tìm thấy lượt khám')
    return v
  }
  const editable = (v: Visit) => {
    if (v.status === 'cancelled') throw new ApiError('conflict', 'Lượt khám đã huỷ, chỉ xem được')
  }
  /** Bác sĩ bắt đầu ghi nhận ⇒ lượt chuyển sang Đang khám (kể cả khi lễ tân chưa bấm Tiếp nhận), như 1.0 */
  const startIfNeeded = (v: Visit, patch: Partial<Visit>, now: string) => {
    if (v.status === 'registered' || v.status === 'waiting') {
      patch.status = 'in_progress'
      patch.startedAt = now
      if (!v.checkedInAt) patch.checkedInAt = now
    }
  }
  const save = async (v: Visit, patch: Partial<Visit>) => (await repos.visits.update(v.id, withFees(v, patch)))!

  return {
    /**
     * Lưu phần khám: { vitals?, reason?, symptoms?, note?, exam?: { medicalHistory, allergy, allergyNote, otherRisk, otherRiskNote,
     * labNote, diagnoses, prescription, advice, followUpEnabled, followUpDays, followUpDate, notes } }
     */
    async saveExam(visitId: string, body: unknown) {
      if (!isObject(body)) throw new ApiError('bad_request', 'Dữ liệu gửi lên phải là một đối tượng JSON')
      const visit = await mustGet(visitId)
      editable(visit)
      const e: Record<string, string> = {}
      const patch: Partial<Visit> = {}
      if (body.vitals !== undefined) patch.vitals = parseVitals(body.vitals, e)
      for (const k of ['reason', 'symptoms', 'note'] as const) if (body[k] !== undefined) patch[k] = str(body[k])
      if (body.exam !== undefined) {
        const x = isObject(body.exam) ? body.exam : (e.exam = 'Phải là đối tượng', {})
        const prev: Partial<ExamRecord> = visit.exam ?? {}
        const followUpEnabled = x.followUpEnabled === undefined ? (prev.followUpEnabled ?? false) : x.followUpEnabled === true
        const followUpDate = x.followUpDate === undefined ? (prev.followUpDate ?? '') : str(x.followUpDate)
        if (followUpEnabled && (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate) || followUpDate <= visit.date)) e['exam.followUpDate'] = 'Ngày tái khám phải sau ngày khám (YYYY-MM-DD)'
        const pick = <T,>(k: keyof ExamRecord, parse: (v: unknown) => T, fallback: T): T => (x[k] === undefined ? ((prev[k] as T) ?? fallback) : parse(x[k]))
        patch.exam = {
          medicalHistory: pick('medicalHistory', str, ''),
          allergy: pick('allergy', (v) => v === true, false),
          allergyNote: pick('allergyNote', str, ''),
          otherRisk: pick('otherRisk', (v) => v === true, false),
          otherRiskNote: pick('otherRiskNote', str, ''),
          labNote: pick('labNote', str, ''),
          diagnoses: pick('diagnoses', (v) => parseDiagnoses(v, e), []),
          prescription: pick('prescription', (v) => parsePrescription(v, e), []),
          advice: pick('advice', str, ''),
          prescriptionSentAt: prev.prescriptionSentAt,
          followUpEnabled,
          followUpDays: pick('followUpDays', (v) => (typeof v === 'number' && v >= 0 ? Math.trunc(v) : 0), 0),
          followUpDate: followUpEnabled ? followUpDate : '',
          notes: pick('notes', (v) => (Array.isArray(v) ? (v as ExamRecord['notes']) : []), []),
        }
      }
      if (Object.keys(e).length) throw new ApiError('validation', 'Dữ liệu khám chưa hợp lệ', e)
      startIfNeeded(visit, patch, clock().toISOString())
      return save(visit, patch)
    },

    /**
     * Thay danh sách chỉ định CLS: { orders: [{ serviceId, quantity?, instruction? }] }.
     * Tên, đơn vị thực hiện, giá lấy từ danh mục; giữ nguyên trạng thái gửi / kết quả của chỉ định đã có;
     * chỉ định đã thu tiền / đang làm / có kết quả thì không bỏ hay đổi số lượng được.
     */
    async setOrders(visitId: string, body: unknown) {
      const visit = await mustGet(visitId)
      editable(visit)
      const raw = isObject(body) && Array.isArray(body.orders) ? body.orders : null
      if (!raw) throw new ApiError('validation', 'Cần danh sách orders', { orders: 'Phải là danh sách' })
      const e: Record<string, string> = {}
      const catalog = await orderableClsServices(repos)
      const current = visit.paraclinicalOrders ?? []
      const byService = new Map(current.map((o) => [o.serviceId, o]))
      const seen = new Set<string>()
      const next: ParaclinicalOrderItem[] = []
      raw.forEach((it, i) => {
        const r = isObject(it) ? it : {}
        const svc = catalog.find((s) => s.id === r.serviceId)
        const quantity = r.quantity === undefined ? 1 : r.quantity
        if (!svc) return void (e[`orders.${i}`] = 'Không có dịch vụ này trong danh mục')
        if (svc.paused) return void (e[`orders.${i}`] = 'Dịch vụ đang tạm ngưng')
        if (seen.has(svc.id)) return void (e[`orders.${i}`] = 'Trùng dịch vụ')
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return void (e[`orders.${i}.quantity`] = 'Số lượng phải là số nguyên ≥ 1')
        seen.add(svc.id)
        const old = byService.get(svc.id)
        if (old) {
          const lock = orderLock(visit, old)
          if (lock && quantity !== old.quantity) return void (e[`orders.${i}.quantity`] = lock)
          next.push({ ...old, quantity, instruction: r.instruction === undefined ? old.instruction : str(r.instruction) })
          return
        }
        const provider = providerById(svc.providerId)
        next.push({
          id: uid('ord'), serviceId: svc.id, providerId: svc.providerId, providerName: provider?.name ?? '', providerAddress: provider?.address ?? '',
          name: svc.name, groupLabel: svc.groupLabel, category: svc.category, unitPrice: svc.price, quantity, instruction: str(r.instruction), performStatus: 'pending',
        })
      })
      for (const o of current) {
        const lock = orderLock(visit, o)
        if (!seen.has(o.serviceId) && lock) e[`orders.${o.serviceId}`] = `Không bỏ được "${o.name}": ${lock}`
      }
      if (Object.keys(e).length) throw new ApiError('validation', 'Chỉ định chưa hợp lệ', e)
      const patch: Partial<Visit> = { paraclinicalOrders: next }
      startIfNeeded(visit, patch, clock().toISOString())
      return save(visit, patch)
    },

    /** Gửi các chỉ định chưa gửi tới nơi thực hiện (resultStatus = waiting) */
    async sendOrders(visitId: string) {
      const visit = await mustGet(visitId)
      editable(visit)
      const now = clock().toISOString()
      const orders = (visit.paraclinicalOrders ?? []).map((o) => (o.sentAt ? o : { ...o, sentAt: now, resultStatus: 'waiting' as const }))
      return save(visit, { paraclinicalOrders: orders })
    },

    /** Gửi đơn thuốc cho người bệnh (mô phỏng — chỉ ghi thời điểm) */
    async sendPrescription(visitId: string) {
      const visit = await mustGet(visitId)
      editable(visit)
      if (!visit.exam?.prescription.length) throw new ApiError('conflict', 'Chưa có thuốc trong đơn')
      return save(visit, { exam: { ...visit.exam, prescriptionSentAt: clock().toISOString() } })
    },

    /**
     * Hoàn thành khám — như finish của 1.0: bắt buộc chiều cao, cân nặng; chưa có chẩn đoán thì phải xác nhận
     * ({ confirmNoDiagnosis: true }); chỉ định chưa gửi được gửi luôn.
     */
    async finish(visitId: string, body: unknown) {
      const visit = await mustGet(visitId)
      editable(visit)
      if (visit.status === 'done') throw new ApiError('conflict', 'Lượt khám đã hoàn thành')
      const e: Record<string, string> = {}
      if (!visit.vitals?.heightCm) e['vitals.heightCm'] = 'Nhập chiều cao trước khi hoàn thành'
      if (!visit.vitals?.weightKg) e['vitals.weightKg'] = 'Nhập cân nặng trước khi hoàn thành'
      if (Object.keys(e).length) throw new ApiError('validation', 'Vui lòng nhập chiều cao và cân nặng', e)
      if (!visit.exam?.diagnoses.length && !(isObject(body) && body.confirmNoDiagnosis === true)) {
        throw new ApiError('conflict', 'Lượt khám chưa có chẩn đoán. Gửi confirmNoDiagnosis: true nếu vẫn hoàn thành', { diagnoses: 'Chưa có chẩn đoán' })
      }
      const now = clock().toISOString()
      const orders = (visit.paraclinicalOrders ?? []).map((o) => (o.sentAt ? o : { ...o, sentAt: now, resultStatus: 'waiting' as const }))
      return save(visit, { status: 'done', finishedAt: now, startedAt: visit.startedAt ?? now, checkedInAt: visit.checkedInAt ?? now, paraclinicalOrders: orders })
    },

    /* ---------------------------- Phía phòng CLS ---------------------------- */

    /** Danh sách chỉ định đã gửi trong khoảng ngày (màn Chẩn đoán hình ảnh / Xét nghiệm) */
    async listOrders(params: { dateFrom?: string; dateTo?: string; category?: string; performStatus?: string; providerId?: string }) {
      const today = todayVN(clock())
      const dateFrom = params.dateFrom || today
      const dateTo = params.dateTo || dateFrom
      if (params.category && params.category !== 'imaging' && params.category !== 'lab') throw new ApiError('validation', 'category: imaging | lab')
      if (params.performStatus && !PERFORM.includes(params.performStatus as PerformStatus)) throw new ApiError('validation', `performStatus: ${PERFORM.join(' | ')}`)
      const visits = await repos.visits.list({ dateFrom, dateTo })
      const patients = new Map((await repos.patients.getMany([...new Set(visits.map((v) => v.patientId))])).map((p) => [p.id, p]))
      const items = visits.flatMap((v) =>
        (v.paraclinicalOrders ?? [])
          .filter((o) => o.sentAt)
          .filter((o) => (!params.category || o.category === params.category) && (!params.providerId || o.providerId === params.providerId))
          .filter((o) => !params.performStatus || (o.performStatus ?? 'pending') === params.performStatus)
          .map((order) => ({ order, visit: { id: v.id, code: v.code, date: v.date, queueNumber: v.queueNumber, status: v.status, doctorId: v.doctorId }, patient: patients.get(v.patientId) ?? null })),
      )
      return { items, total: items.length }
    },

    /**
     * Phòng CLS cập nhật một chỉ định: { performStatus?, result?: { description, conclusion, recommendation, images?, files? } }.
     * Có kết quả ⇒ resultStatus = has_result, performStatus = done. Huỷ / không đến ⇒ không tính tiền (trừ khi đã thu).
     */
    async updateOrder(visitId: string, orderId: string, body: unknown) {
      if (!isObject(body)) throw new ApiError('bad_request', 'Dữ liệu gửi lên phải là một đối tượng JSON')
      const visit = await mustGet(visitId)
      editable(visit)
      const order = (visit.paraclinicalOrders ?? []).find((o) => o.id === orderId)
      if (!order) throw new ApiError('not_found', 'Không tìm thấy chỉ định')
      if (!order.sentAt) throw new ApiError('conflict', 'Chỉ định chưa được gửi tới nơi thực hiện')
      const e: Record<string, string> = {}
      const patch: Partial<ParaclinicalOrderItem> = {}
      if (body.performStatus !== undefined) {
        if (!PERFORM.includes(body.performStatus as PerformStatus)) e.performStatus = PERFORM.join(' | ')
        else if (order.resultStatus === 'has_result' && body.performStatus !== 'done') e.performStatus = 'Đã có kết quả, không đổi trạng thái được'
        else patch.performStatus = body.performStatus as PerformStatus
      }
      if (body.result !== undefined) {
        const r = isObject(body.result) ? body.result : (e.result = 'Phải là đối tượng', {})
        const now = clock().toISOString()
        const images = parseFiles(r.images, 'result.images', e, now)
        const files = parseFiles(r.files, 'result.files', e, now)
        if ([...images, ...files].reduce((s, f) => s + f.dataUrl.length, 0) > MAX_FILES_BYTES) e['result.files'] = 'Tệp đính kèm quá lớn (tối đa ~2 MB mỗi chỉ định)'
        if (!str(r.conclusion) && !str(r.description) && !files.length && !images.length) e.result = 'Cần mô tả, kết luận hoặc tệp kết quả'
        const result: ParaclinicalResult = { description: str(r.description), conclusion: str(r.conclusion), recommendation: str(r.recommendation), images, files, updatedAt: now, by }
        patch.result = result
        patch.resultStatus = 'has_result'
        patch.performStatus = 'done'
      }
      if (Object.keys(e).length) throw new ApiError('validation', 'Cập nhật chỉ định chưa hợp lệ', e)
      const orders = (visit.paraclinicalOrders ?? []).map((o) => (o.id === orderId ? { ...o, ...patch } : o))
      const updated = await save(visit, { paraclinicalOrders: orders })
      return updated.paraclinicalOrders!.find((o) => o.id === orderId)!
    },
  }
}
