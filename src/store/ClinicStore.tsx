import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createSeedState, defaultReceptionView, formatVisitCode, STATE_VERSION } from './seed'
import { INITIAL_COMBOS } from './paraclinicalCatalog'
import { addMinutesToTime, todayISO } from '@/lib/date'
import type {
  ClinicState,
  ParaclinicalCombo,
  Patient,
  PatientInput,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
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

type Action =
  | { type: 'HYDRATE'; state: ClinicState }
  | { type: 'RESET_DEMO' }
  | { type: 'NAVIGATE'; route: RouteKey }
  | { type: 'SET_UI'; patch: Partial<Omit<UIState, 'reception'>> }
  | { type: 'SET_RECEPTION_VIEW'; patch: Partial<ReceptionViewState> }
  | { type: 'ADD_PATIENT'; patient: Patient }
  | { type: 'UPDATE_PATIENT'; id: string; patch: Partial<Patient> }
  | { type: 'ADD_VISIT'; visit: Visit }
  | { type: 'UPDATE_VISIT'; id: string; patch: Partial<Visit> }
  | { type: 'ADD_COMBO'; combo: ParaclinicalCombo }
  | { type: 'SET_DEFAULT_PROVIDER'; providerId: string }

function reducer(state: ClinicState, action: Action): ClinicState {
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
    case 'ADD_VISIT':
      return { ...state, visits: [...state.visits, action.visit] }
    case 'UPDATE_VISIT':
      return { ...state, visits: state.visits.map((v) => (v.id === action.id ? { ...v, ...action.patch } : v)) }
    case 'ADD_COMBO':
      return { ...state, paraclinicalCombos: [action.combo, ...state.paraclinicalCombos] }
    case 'SET_DEFAULT_PROVIDER':
      return { ...state, defaultProviderId: action.providerId }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'clinic-his:state'

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function paidAmount(visit: Pick<Visit, 'payments'>) {
  return visit.payments.reduce((sum, p) => sum + (p.kind === 'payment' ? p.amount : -p.amount), 0)
}

export function remainingAmount(visit: Pick<Visit, 'payments' | 'fee'>) {
  return Math.max(visit.fee - paidAmount(visit), 0)
}

function derivePaymentStatus(fee: number, paid: number): PaymentStatus {
  if (paid <= 0) return fee === 0 ? 'unpaid' : 'unpaid'
  if (paid < fee) return 'partial'
  return 'paid'
}

function nextPatientCode(patients: Patient[]) {
  const max = patients.reduce((m, p) => Math.max(m, Number(p.code.replace(/\D/g, '')) || 0), 0)
  return `BN${String(max + 1).padStart(6, '0')}`
}

function nextQueue(visits: Visit[], date: string) {
  const sameDay = visits.filter((v) => v.date === date)
  const queue = sameDay.reduce((m, v) => Math.max(m, v.queueNumber), 0) + 1
  const code = formatVisitCode(date, queue)
  return { queue, code }
}

/** Khôi phục state đã lưu; bộ lọc ngày luôn quay về hôm nay khi mở lại ứng dụng */
function loadPersisted(): ClinicState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClinicState
    if (parsed.version !== STATE_VERSION) return null
    const today = todayISO()
    const defaults = defaultReceptionView()
    return {
      ...parsed,
      paraclinicalCombos: parsed.paraclinicalCombos ?? INITIAL_COMBOS,
      defaultProviderId: parsed.defaultProviderId ?? 'lab_internal',
      ui: {
        ...parsed.ui,
        reception: {
          ...defaults,
          ...parsed.ui.reception,
          filters: { ...defaults.filters, ...parsed.ui.reception.filters, dateFrom: today, dateTo: today },
          page: 1,
        },
      },
    }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type NavGuard = (nextRoute: RouteKey) => boolean

function createActions(dispatch: React.Dispatch<Action>, getState: () => ClinicState) {
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
        ? [{ id: uid('pay'), kind: 'payment', amount: payAmt, method: input.payMethod, at: now() }]
        : []
    const status: VisitStatus = input.initialStatus ?? (input.checkInNow ? 'waiting' : 'registered')
    const paymentStatus: PaymentStatus = input.payNow
      ? totalFee === 0 || payAmt >= totalFee
        ? 'paid'
        : payAmt > 0
          ? 'partial'
          : 'unpaid'
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

    updatePatient: (id: string, patch: Partial<Patient>) => dispatch({ type: 'UPDATE_PATIENT', id, patch }),
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
      const payments = [...visit.payments, { id: uid('pay'), kind: 'payment' as const, amount, method, at: now(), note }]
      const totalPaid = paidAmount({ payments })
      dispatch({
        type: 'UPDATE_VISIT',
        id,
        patch: { payments, paymentStatus: visit.fee === 0 ? 'paid' : derivePaymentStatus(visit.fee, totalPaid) },
      })
    },

    cancelVisit: (id: string, reason: string, refund: boolean, refundMethod: PaymentMethod = 'cash') => {
      const visit = getState().visits.find((v) => v.id === id)
      if (!visit) return
      const paid = paidAmount(visit)
      const payments =
        refund && paid > 0
          ? [...visit.payments, { id: uid('pay'), kind: 'refund' as const, amount: paid, method: refundMethod, at: now(), note: 'Hoàn tiền do hủy lượt khám' }]
          : visit.payments
      dispatch({
        type: 'UPDATE_VISIT',
        id,
        patch: {
          status: 'cancelled',
          cancelReason: reason,
          payments,
          paymentStatus: refund && paid > 0 ? 'refunded' : paid > 0 ? visit.paymentStatus : visit.fee === 0 ? 'none' : 'cancelled',
        },
      })
    },
  }
}

export type ClinicActions = ReturnType<typeof createActions>

const StateContext = createContext<ClinicState | null>(null)
const ActionsContext = createContext<ClinicActions | null>(null)

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createSeedState)
  const stateRef = useRef(state)
  stateRef.current = state
  const [hydrated, setHydrated] = useState(false)

  // Hydrate trên client (an toàn khi chuyển sang Next.js SSR)
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) dispatch({ type: 'HYDRATE', state: persisted })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* bộ nhớ đầy hoặc bị chặn – bỏ qua */
    }
  }, [state, hydrated])

  const actions = useMemo(() => createActions(dispatch, () => stateRef.current), [])

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  )
}

export function useClinicState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useClinicState phải nằm trong <ClinicProvider>')
  return ctx
}

export function useClinicActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useClinicActions phải nằm trong <ClinicProvider>')
  return ctx
}
