/**
 * Reducer và các thao tác nghiệp vụ của store — không phụ thuộc React/DOM để test được bằng Vitest
 * (ClinicStore.tsx chỉ lo Provider, lưu localStorage và đồng bộ danh mục).
 */
import type { Dispatch } from 'react'
import { createSeedState } from './seed'
import { clsCharge, clsUnit, derivePaymentStatus, nextReceiptCode, paidAmount, patientDeleteBlock, prepaidCredit } from './billing'
import { currentUser, runtimeCode } from './runtime'
import { addMinutesToTime, todayISO } from '@/lib/date'
import { serviceById } from './catalog'
import type {
  ClinicState,
  ParaclinicalCombo,
  Patient,
  PatientInput,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  ParaclinicalOrderItem,
  EmrAccessLog,
  ReportDownload,
  Schedules,
  ClinicProfile,
  SystemSettings,
  Service,
  ParaclinicalServiceItem,
  ResultTemplate,
  PrescriptionTemplate,
  InvoiceInfo,
  ReceiptLine,
  ReceptionViewState,
  RouteKey,
  UIState,
  Visit,
  VisitInput,
  VisitStatus,
} from './types'

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: 'HYDRATE'; state: ClinicState }
  | { type: 'RESET_DEMO' }
  | { type: 'NAVIGATE'; route: RouteKey }
  | { type: 'SET_UI'; patch: Partial<Omit<UIState, 'reception'>> }
  | { type: 'SET_RECEPTION_VIEW'; patch: Partial<ReceptionViewState> }
  | { type: 'ADD_PATIENT'; patient: Patient }
  | { type: 'UPDATE_PATIENT'; id: string; patch: Partial<Patient> }
  | { type: 'DELETE_PATIENT'; id: string }
  | { type: 'ADD_VISIT'; visit: Visit }
  | { type: 'UPDATE_VISIT'; id: string; patch: Partial<Visit> }
  | { type: 'ADD_COMBO'; combo: ParaclinicalCombo }
  | { type: 'ADD_PRESCRIPTION_TEMPLATE'; template: PrescriptionTemplate }
  | { type: 'UPDATE_PRESCRIPTION_TEMPLATE'; id: string; patch: Partial<Omit<PrescriptionTemplate, 'id'>> }
  | { type: 'DELETE_PRESCRIPTION_TEMPLATE'; id: string }
  | { type: 'ADD_EMR_LOG'; log: EmrAccessLog }
  | { type: 'ADD_DOWNLOAD'; item: ReportDownload }
  | { type: 'SET_SCHEDULES'; schedules: Schedules }
  | { type: 'SET_SYSTEM'; system: SystemSettings }
  | { type: 'SET_SERVICES'; services: Service[] }
  | { type: 'SET_CLS_SERVICES'; services: ParaclinicalServiceItem[] }
  | { type: 'ADD_RESULT_TEMPLATE'; template: ResultTemplate }
  | { type: 'UPDATE_RESULT_TEMPLATES'; templates: ResultTemplate[] }
  | { type: 'SET_CLINIC_PROFILE'; profile: ClinicProfile }
  | { type: 'SET_DEFAULT_PROVIDER'; providerId: string }

export function reducer(state: ClinicState, action: Action): ClinicState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'RESET_DEMO': {
      const fresh = createSeedState()
      return { ...fresh, ui: { ...fresh.ui, activeRoute: state.ui.activeRoute, sidebarCollapsed: state.ui.sidebarCollapsed } }
    }
    case 'NAVIGATE':
      return { ...state, ui: { ...state.ui, activeRoute: action.route } }
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.patch } }
    case 'SET_RECEPTION_VIEW':
      return { ...state, ui: { ...state.ui, reception: { ...state.ui.reception, ...action.patch } } }
    case 'ADD_PATIENT':
      return { ...state, patients: [action.patient, ...state.patients] }
    case 'UPDATE_PATIENT':
      return { ...state, patients: state.patients.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) }
    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter((p) => p.id !== action.id),
        visits: state.visits.filter((v) => v.patientId !== action.id),
        ui: { ...state.ui, examVisitId: state.visits.some((v) => v.id === state.ui.examVisitId && v.patientId === action.id) ? null : state.ui.examVisitId },
      }
    case 'ADD_VISIT':
      return { ...state, visits: [...state.visits, action.visit] }
    case 'UPDATE_VISIT':
      return { ...state, visits: state.visits.map((v) => (v.id === action.id ? { ...v, ...action.patch } : v)) }
    case 'ADD_COMBO':
      return { ...state, paraclinicalCombos: [action.combo, ...state.paraclinicalCombos] }
    case 'SET_SYSTEM':
      return { ...state, system: action.system }
    case 'SET_SERVICES':
      return { ...state, services: action.services }
    case 'SET_CLS_SERVICES':
      return { ...state, clsServices: action.services }
    case 'ADD_RESULT_TEMPLATE':
      return { ...state, resultTemplates: [action.template, ...(state.resultTemplates ?? [])] }
    case 'UPDATE_RESULT_TEMPLATES':
      return { ...state, resultTemplates: action.templates }
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.schedules }
    case 'SET_CLINIC_PROFILE':
      return { ...state, clinicProfile: action.profile }
    case 'ADD_DOWNLOAD':
      return { ...state, reportDownloads: [action.item, ...(state.reportDownloads ?? [])].slice(0, 50) }
    case 'ADD_EMR_LOG':
      return { ...state, emrLogs: [action.log, ...(state.emrLogs ?? [])].slice(0, 500) }
    case 'ADD_PRESCRIPTION_TEMPLATE':
      return { ...state, prescriptionTemplates: [action.template, ...(state.prescriptionTemplates ?? [])] }
    case 'UPDATE_PRESCRIPTION_TEMPLATE':
      return { ...state, prescriptionTemplates: (state.prescriptionTemplates ?? []).map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) }
    case 'DELETE_PRESCRIPTION_TEMPLATE':
      return { ...state, prescriptionTemplates: (state.prescriptionTemplates ?? []).filter((t) => t.id !== action.id) }
    case 'SET_DEFAULT_PROVIDER':
      return { ...state, defaultProviderId: action.providerId }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

function nextPatientCode(patients: Patient[]) {
  const max = patients.reduce((m, p) => Math.max(m, Number(p.code.replace(/\D/g, '')) || 0), 0)
  return `BN${String(max + 1).padStart(6, '0')}`
}

function nextQueue(visits: Visit[], date: string) {
  const sameDay = visits.filter((v) => v.date === date)
  const queue = sameDay.reduce((m, v) => Math.max(m, v.queueNumber), 0) + 1
  const code = runtimeCode(date, queue)
  return { queue, code }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type NavGuard = (nextRoute: RouteKey) => boolean

export function createActions(dispatch: Dispatch<Action>, getState: () => ClinicState) {
  const now = () => new Date().toISOString()
  let navGuard: NavGuard | null = null

  const buildVisit = (patientId: string, input: VisitInput, patientType: Visit['patientType']): Visit => {
    const state = getState()
    const { queue, code } = nextQueue(state.visits, input.date)
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
              at: now(),
              code: nextReceiptCode(state.visits, todayISO()),
              cashier: currentUser(),
              // Thu đủ lúc tiếp nhận => ghi rõ các dòng; thu thiếu => để phân bổ theo thứ tự
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
      ? totalFee === 0 || payAmt >= totalFee
        ? 'paid'
        : payAmt > 0
          ? 'partial'
          : 'unpaid'
      : totalFee === 0
        ? 'none'
        : 'unpaid'

    return {
      id: uid('v'),
      code,
      patientId,
      queueNumber: queue,
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
      patientType,
      visitKind: input.visitKind ?? 'Lịch khám',
      category: input.category,
      source: input.source,
      reason: input.reason.trim(),
      symptoms: input.symptoms?.trim() ?? '',
      note: input.note.trim(),
      vitals: input.vitals,
      createdAt: now(),
      checkedInAt: status === 'waiting' || status === 'in_progress' ? now() : undefined,
      startedAt: status === 'in_progress' ? now() : undefined,
    }
  }

  return {
    navigate: (route: RouteKey) => {
      if (route === getState().ui.activeRoute) return
      if (navGuard && !navGuard(route)) return
      dispatch({ type: 'NAVIGATE', route })
    },
    forceNavigate: (route: RouteKey) => dispatch({ type: 'NAVIGATE', route }),
    setNavigationGuard: (guard: NavGuard | null) => {
      navGuard = guard
    },
    setUI: (patch: Partial<Omit<UIState, 'reception'>>) => dispatch({ type: 'SET_UI', patch }),
    setReceptionView: (patch: Partial<ReceptionViewState>) => dispatch({ type: 'SET_RECEPTION_VIEW', patch }),
    resetDemoData: () => dispatch({ type: 'RESET_DEMO' }),
    setDefaultProvider: (providerId: string) => dispatch({ type: 'SET_DEFAULT_PROVIDER', providerId }),
    saveParaclinicalCombo: (
      name: string,
      providerId: string,
      items: { serviceId: string; quantity: number; instruction?: string }[],
    ) => {
      const combo: ParaclinicalCombo = { id: uid('combo'), name: name.trim(), providerId, items }
      dispatch({ type: 'ADD_COMBO', combo })
      return combo
    },

    /** Thêm bệnh mới: tạo hồ sơ người bệnh + lượt khám */
    registerNewPatient: (patientInput: PatientInput, visitInput: VisitInput) => {
      const patient: Patient = {
        ...patientInput,
        fullName: patientInput.fullName.trim(),
        id: uid('p'),
        code: nextPatientCode(getState().patients),
        createdAt: now(),
      }
      dispatch({ type: 'ADD_PATIENT', patient })
      const visit = buildVisit(patient.id, visitInput, 'new')
      dispatch({ type: 'ADD_VISIT', visit })
      return { patient, visit }
    },

    /** Thêm bệnh cũ: tạo lượt khám mới cho người bệnh đã có hồ sơ */
    registerVisit: (patientId: string, visitInput: VisitInput, patientPatch?: Partial<PatientInput>) => {
      if (patientPatch) {
        dispatch({ type: 'UPDATE_PATIENT', id: patientId, patch: patientPatch })
      }
      const visit = buildVisit(patientId, visitInput, 'returning')
      dispatch({ type: 'ADD_VISIT', visit })
      return visit
    },

    /**
     * Lưu dữ liệu khám của bác sĩ. Tự tính lại tổng phí (CK + CLS + Th)
     * và trạng thái thanh toán theo số đã thu.
     */
    saveExam: (id: string, patch: Partial<Visit>) => {
      const visit = getState().visits.find((v) => v.id === id)
      if (!visit) return
      const merged = { ...visit, ...patch }
      const cls = clsCharge(merged.paraclinicalOrders, merged.payments)
      const fee = (merged.consultationFee ?? 0) + cls + (merged.medicationFee ?? 0)
      const paymentStatus = merged.status === 'cancelled' ? merged.paymentStatus : derivePaymentStatus({ payments: merged.payments, fee }, merged.paymentStatus)
      dispatch({ type: 'UPDATE_VISIT', id, patch: { ...patch, fee, paymentStatus } })
    },

    savePrescriptionTemplate: (template: Omit<PrescriptionTemplate, 'id'>) => {
      const full: PrescriptionTemplate = { ...template, id: uid('tpl') }
      dispatch({ type: 'ADD_PRESCRIPTION_TEMPLATE', template: full })
      return full
    },

    /** Đổi tên đơn mẫu; tên rỗng hoặc trùng (không phân biệt hoa thường) ⇒ trả lỗi, không đổi */
    renamePrescriptionTemplate: (id: string, name: string): string | null => {
      const clean = name.trim().replace(/\s+/g, ' ')
      if (!clean) return 'Tên đơn mẫu không được để trống'
      const list = getState().prescriptionTemplates ?? []
      if (list.some((t) => t.id !== id && t.name.toLocaleLowerCase('vi') === clean.toLocaleLowerCase('vi'))) return 'Đã có đơn mẫu cùng tên'
      dispatch({ type: 'UPDATE_PRESCRIPTION_TEMPLATE', id, patch: { name: clean } })
      return null
    },

    deletePrescriptionTemplate: (id: string) => dispatch({ type: 'DELETE_PRESCRIPTION_TEMPLATE', id }),

    /** Cập nhật một chỉ định CLS (trạng thái thực hiện, kết quả...) – dùng ở phòng CĐHA / Xét nghiệm */
    updateOrder: (visitId: string, orderId: string, patch: Partial<ParaclinicalOrderItem>) => {
      const visit = getState().visits.find((v) => v.id === visitId)
      if (!visit) return
      const paraclinicalOrders = (visit.paraclinicalOrders ?? []).map((o) => (o.id === orderId ? { ...o, ...patch } : o))
      // Huỷ / NB không đến làm đổi số tiền phải thu => tính lại phí và trạng thái thanh toán
      const fee = (visit.consultationFee ?? 0) + clsCharge(paraclinicalOrders, visit.payments) + (visit.medicationFee ?? 0)
      const paymentStatus = visit.status === 'cancelled' ? visit.paymentStatus : derivePaymentStatus({ payments: visit.payments, fee }, visit.paymentStatus)
      dispatch({ type: 'UPDATE_VISIT', id: visitId, patch: { paraclinicalOrders, fee, paymentStatus } })
    },

    setSchedules: (schedules: Schedules) => dispatch({ type: 'SET_SCHEDULES', schedules }),
    setSystem: (system: SystemSettings) => dispatch({ type: 'SET_SYSTEM', system }),
    setServices: (services: Service[]) => dispatch({ type: 'SET_SERVICES', services }),
    setClsServices: (services: ParaclinicalServiceItem[]) => dispatch({ type: 'SET_CLS_SERVICES', services }),
    setResultTemplates: (templates: ResultTemplate[]) => dispatch({ type: 'UPDATE_RESULT_TEMPLATES', templates }),
    setClinicProfile: (profile: ClinicProfile) => dispatch({ type: 'SET_CLINIC_PROFILE', profile }),

    /** Ghi lịch sử tải báo cáo (giữ nội dung nhỏ để tải lại) */
    recordDownload: (item: Omit<ReportDownload, 'id' | 'at' | 'status'>) =>
      dispatch({ type: 'ADD_DOWNLOAD', item: { ...item, content: item.content && item.content.length < 200_000 ? item.content : undefined, id: uid('dl'), at: now(), status: 'success' } }),

    /** Ghi nhật ký truy cập bệnh án */
    logEmrAccess: (log: Omit<EmrAccessLog, 'id' | 'at' | 'user'>) =>
      dispatch({ type: 'ADD_EMR_LOG', log: { ...log, id: uid('log'), at: now(), user: currentUser() } }),

    /** Chuyển sang Lễ tân và mở Thêm bệnh cũ / mới (dùng ở Lịch khám, màn khám) */
    startReception: (mode: 'existing' | 'new') => {
      dispatch({ type: 'SET_UI', patch: { receptionAction: mode } })
      dispatch({ type: 'NAVIGATE', route: 'reception' })
    },

    /** Mở màn khám cho một lượt khám (null = về danh sách) */
    openExam: (visitId: string | null) => {
      dispatch({ type: 'SET_UI', patch: { examVisitId: visitId } })
      if (getState().ui.activeRoute !== 'examination') dispatch({ type: 'NAVIGATE', route: 'examination' })
    },

    updatePatient: (id: string, patch: Partial<Patient>) => dispatch({ type: 'UPDATE_PATIENT', id, patch: { ...patch, updatedAt: now() } }),

    /** Thêm hồ sơ người bệnh (không tạo lượt khám) – trang Người bệnh */
    addPatient: (input: PatientInput) => {
      const patient: Patient = { ...input, fullName: input.fullName.trim(), id: uid('p'), code: nextPatientCode(getState().patients), createdAt: now(), updatedAt: now() }
      dispatch({ type: 'ADD_PATIENT', patient })
      return patient
    },

    /** Xoá hồ sơ người bệnh cùng mọi lượt khám của người bệnh đó */
    deletePatient: (id: string) => {
      if (patientDeleteBlock(getState().visits.filter((v) => v.patientId === id))) return false
      dispatch({ type: 'DELETE_PATIENT', id })
      return true
    },
    updateVisit: (id: string, patch: Partial<Visit>) => dispatch({ type: 'UPDATE_VISIT', id, patch }),

    setVisitStatus: (id: string, status: VisitStatus) => {
      const patch: Partial<Visit> = { status }
      if (status === 'waiting') patch.checkedInAt = now()
      if (status === 'in_progress') patch.startedAt = now()
      if (status === 'done') patch.finishedAt = now()
      dispatch({ type: 'UPDATE_VISIT', id, patch })
    },

    collectPayment: (id: string, amount: number, method: PaymentMethod, note?: string) => {
      const visit = getState().visits.find((v) => v.id === id)
      if (!visit || (amount < 0 || (amount === 0 && visit.fee > 0))) return
      const payments = [...visit.payments, { id: uid('pay'), kind: 'payment' as const, amount, method, at: now(), note, cashier: currentUser() }]
      dispatch({ type: 'UPDATE_VISIT', id, patch: { payments, paymentStatus: derivePaymentStatus({ payments, fee: visit.fee }, visit.paymentStatus) } })
    },

    /**
     * Thu tiền theo dòng (công khám / từng CLS), có giảm giá dòng và giảm giá tổng.
     * Trả về phiếu thu vừa tạo.
     */
    checkout: (
      id: string,
      input: { lines: ReceiptLine[]; discount: number; customerPaid: number; method: PaymentMethod; invoice?: InvoiceInfo; note?: string; prepaid?: number },
    ): PaymentRecord | null => {
      const state = getState()
      const visit = state.visits.find((v) => v.id === id)
      if (!visit || input.lines.length === 0) return null
      const gross = input.lines.reduce((s, l) => s + Math.max(l.unitPrice * l.quantity - l.discount, 0), 0)
      // Trừ phần đã tạm thu trước (không vượt quá số của phiếu này) để không thu trùng
      const prepaid = Math.min(Math.max(input.prepaid ?? 0, 0), Math.max(gross - input.discount, 0), prepaidCredit(visit))
      const amount = Math.max(gross - input.discount - prepaid, 0)
      const at = now()
      const record: PaymentRecord = {
        id: uid('pay'),
        kind: 'payment',
        amount,
        method: input.method,
        at,
        note: input.note,
        code: nextReceiptCode(state.visits, todayISO()),
        lines: input.lines,
        discount: input.discount,
        customerPaid: input.customerPaid,
        ...(prepaid > 0 ? { prepaid } : {}),
        cashier: currentUser(),
        invoice: input.invoice,
      }
      const payments = [...visit.payments, record]
      dispatch({ type: 'UPDATE_VISIT', id, patch: { payments, paymentStatus: derivePaymentStatus({ payments, fee: visit.fee }, visit.paymentStatus) } })
      return record
    },

    /** Cập nhật thông tin / trạng thái hoá đơn điện tử của một phiếu thu */
    updateReceiptInvoice: (visitId: string, paymentId: string, invoice: InvoiceInfo) => {
      const visit = getState().visits.find((v) => v.id === visitId)
      if (!visit) return
      dispatch({ type: 'UPDATE_VISIT', id: visitId, patch: { payments: visit.payments.map((p) => (p.id === paymentId ? { ...p, invoice } : p)) } })
    },

    cancelVisit: (id: string, reason: string, refund: boolean, refundMethod: PaymentMethod = 'cash') => {
      const visit = getState().visits.find((v) => v.id === id)
      if (!visit) return
      const paid = paidAmount(visit)
      const payments =
        refund && paid > 0
          ? [...visit.payments, { id: uid('pay'), kind: 'refund' as const, amount: paid, method: refundMethod, at: now(), note: 'Hoàn tiền do huỷ lượt khám' }]
          : visit.payments
      dispatch({
        type: 'UPDATE_VISIT',
        id,
        patch: {
          status: 'cancelled',
          cancelReason: reason,
          payments,
          // Chỉ định chưa làm xong của lượt bị huỷ cũng huỷ theo (đã có kết quả thì giữ nguyên)
          paraclinicalOrders: (visit.paraclinicalOrders ?? []).map((o) =>
            o.resultStatus === 'has_result' || o.performStatus === 'done' ? o : { ...o, performStatus: 'cancelled' as const },
          ),
          paymentStatus: refund && paid > 0 ? 'refunded' : paid > 0 ? visit.paymentStatus : visit.fee === 0 ? 'none' : 'cancelled',
        },
      })
    },
  }
}

export type ClinicActions = ReturnType<typeof createActions>
