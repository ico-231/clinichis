/**
 * Lớp gọi API backend cho giao diện 2.0 (chưa dùng ở 1.0 — 1.0 vẫn lưu localStorage).
 * Mọi hàm trả đúng kiểu dữ liệu của src/store/types.ts; lỗi ném ApiClientError có mã, thông điệp tiếng Việt, lỗi từng trường.
 */
import type {
  ClinicProfile, ParaclinicalOrderItem, Patient, PaymentMethod, PaymentRecord, Schedules, SystemSettings, Visit, VisitStatus,
} from '@/store/types'

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

export interface ClientOptions {
  /** Gốc API, mặc định cùng tên miền (Vercel) */
  baseUrl?: string
  /** Mã truy cập bản demo (header x-clinic-key), mặc định VITE_CLINIC_API_KEY */
  apiKey?: string
  fetchImpl?: typeof fetch
}

type Query = Record<string, string | number | undefined>
const qs = (q: Query = {}) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}
const enc = encodeURIComponent

export type VisitRow = { visit: Visit; patient: Patient }
export type BillingLine = { kind: 'consultation' | 'paraclinical'; refId: string; name: string; unit: string; quantity: number; unitPrice: number; discount: number; paid: boolean }
export type Billing = { visitId: string; fee: number; paid: number; discount: number; remaining: number; paymentStatus: Visit['paymentStatus']; lines: BillingLine[]; payments: PaymentRecord[] }
export type CatalogKind = 'services' | 'cls_services' | 'paraclinical_combos' | 'prescription_templates' | 'result_templates' | 'drugs' | 'providers' | 'doctors' | 'rooms' | 'external_cls'
export type SettingKey = 'clinic_profile' | 'system' | 'schedules' | 'default_provider_id'

export function createApiClient(opts: ClientOptions = {}) {
  const base = (opts.baseUrl ?? '').replace(/\/$/, '')
  const apiKey = opts.apiKey ?? (import.meta.env?.VITE_CLINIC_API_KEY as string | undefined)
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a))

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${base}/api${path}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(apiKey ? { 'x-clinic-key': apiKey } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (res.status === 204) return undefined as T
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const err = (data as { error?: { code: string; message: string; fields?: Record<string, string> } } | null)?.error
      throw new ApiClientError(res.status, err?.code ?? 'network', err?.message ?? `Lỗi ${res.status}`, err?.fields)
    }
    return data as T
  }

  return {
    patients: {
      list: (q?: { q?: string; limit?: number; offset?: number }) => call<{ items: Patient[]; total: number }>('GET', `/patients${qs(q)}`),
      get: (id: string) => call<Patient>('GET', `/patients/${enc(id)}`),
      create: (p: Partial<Patient>) => call<Patient>('POST', '/patients', p),
      update: (id: string, patch: Partial<Patient>) => call<Patient>('PATCH', `/patients/${enc(id)}`, patch),
      remove: (id: string) => call<void>('DELETE', `/patients/${enc(id)}`),
    },
    visits: {
      list: (q?: { dateFrom?: string; dateTo?: string; status?: VisitStatus; paymentStatus?: Visit['paymentStatus']; patientId?: string; q?: string }) =>
        call<{ items: VisitRow[]; total: number }>('GET', `/visits${qs(q)}`),
      get: (id: string) => call<Visit>('GET', `/visits/${enc(id)}`),
      register: (body: { patientId: string; visit: Record<string, unknown>; patientPatch?: Partial<Patient> } | { patient: Partial<Patient>; visit: Record<string, unknown> }) =>
        call<{ patient: Patient; visit: Visit }>('POST', '/visits', body),
      setStatus: (id: string, status: VisitStatus) => call<Visit>('POST', `/visits/${enc(id)}/status`, { status }),
      cancel: (id: string, body: { reason: string; refund?: boolean; refundMethod?: PaymentMethod }) => call<Visit>('POST', `/visits/${enc(id)}/cancel`, body),
      saveExam: (id: string, body: Record<string, unknown>) => call<Visit>('PUT', `/visits/${enc(id)}/exam`, body),
      setOrders: (id: string, orders: { serviceId: string; quantity?: number; instruction?: string }[]) => call<Visit>('PUT', `/visits/${enc(id)}/orders`, { orders }),
      sendOrders: (id: string) => call<Visit>('POST', `/visits/${enc(id)}/orders/send`),
      updateOrder: (id: string, orderId: string, body: Record<string, unknown>) => call<ParaclinicalOrderItem>('PATCH', `/visits/${enc(id)}/orders/${enc(orderId)}`, body),
      sendPrescription: (id: string) => call<Visit>('POST', `/visits/${enc(id)}/prescription/send`),
      finish: (id: string, confirmNoDiagnosis = false) => call<Visit>('POST', `/visits/${enc(id)}/finish`, { confirmNoDiagnosis }),
    },
    payments: {
      summary: (visitId: string) => call<Billing>('GET', `/visits/${enc(visitId)}/payments`),
      checkout: (visitId: string, body: { items: { kind: BillingLine['kind']; refId: string; discount?: number }[]; discount?: number; customerPaid?: number; method: PaymentMethod; invoice?: unknown; note?: string }) =>
        call<{ receipt: PaymentRecord; change: number; billing: Billing }>('POST', `/visits/${enc(visitId)}/payments`, body),
      setInvoice: (visitId: string, paymentId: string, invoice: unknown) => call<PaymentRecord>('PUT', `/visits/${enc(visitId)}/payments/${enc(paymentId)}/invoice`, { invoice }),
    },
    orders: {
      worklist: (q?: { dateFrom?: string; dateTo?: string; category?: 'imaging' | 'lab'; performStatus?: string; providerId?: string }) =>
        call<{ items: { order: ParaclinicalOrderItem; visit: Pick<Visit, 'id' | 'code' | 'date' | 'queueNumber' | 'status' | 'doctorId'>; patient: Patient | null }[]; total: number }>('GET', `/orders${qs(q)}`),
    },
    catalog: {
      list: <T = unknown>(kind: CatalogKind) => call<{ kind: CatalogKind; editable: boolean; source: 'default' | 'saved'; items: T[] }>('GET', `/catalog/${kind}`),
      replace: <T = unknown>(kind: CatalogKind, items: T[]) => call<{ items: T[] }>('PUT', `/catalog/${kind}`, { items }),
    },
    settings: {
      get: <T = ClinicProfile | SystemSettings | Schedules | string>(key: SettingKey) => call<{ key: SettingKey; source: 'default' | 'saved'; data: T }>('GET', `/settings/${key}`),
      set: <T>(key: SettingKey, data: T) => call<{ data: T }>('PUT', `/settings/${key}`, { data }),
    },
    reports: {
      summary: (q?: { dateFrom?: string; dateTo?: string }) => call<Record<string, unknown>>('GET', `/reports/summary${qs(q)}`),
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
