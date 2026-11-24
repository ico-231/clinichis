import { addDays } from '@/lib/date'
import { serviceById } from '@/store/catalog'
import { clsCharge } from '@/store/billing'
import type { PaymentRecord, Diagnosis, ExamRecord, ParaclinicalOrderItem, PrescriptionItem, VisitNote, Visit, VitalSigns } from '@/store/types'

/** Bản nháp màn khám – chỉ ghi vào store khi bấm Lưu / Hoàn thành */
export interface ExamDraft {
  date: string
  time: string
  serviceId: string
  reason: string
  note: string
  symptoms: string
  vitals: Required<VitalSigns>
  medicalHistory: string
  allergy: boolean
  allergyNote: string
  otherRisk: boolean
  otherRiskNote: string
  orders: ParaclinicalOrderItem[]
  labNote: string
  diagnoses: Diagnosis[]
  prescription: PrescriptionItem[]
  advice: string
  followUpEnabled: boolean
  followUpDays: number
  followUpDate: string
  notes: VisitNote[]
}

const emptyVitals = (): Required<VitalSigns> => ({
  heightCm: '',
  weightKg: '',
  temperatureC: '',
  bpSystolic: '',
  bpDiastolic: '',
  pulse: '',
  respiratoryRate: '',
  spo2: '',
  bmi: '',
})

/**
 * @param knownAllergies dị ứng ghi trong hồ sơ người bệnh – điền sẵn vào "Yếu tố rủi ro"
 * khi lượt khám chưa có bản ghi khám, để bác sĩ không bỏ sót khi kê đơn.
 */
export function draftFromVisit(visit: Visit, knownAllergies?: string): ExamDraft {
  const exam = visit.exam
  const prefillAllergy = !exam && !!knownAllergies?.trim()
  return {
    date: visit.date,
    time: visit.time,
    serviceId: visit.serviceId,
    reason: visit.reason ?? '',
    note: visit.note ?? '',
    symptoms: visit.symptoms ?? '',
    vitals: { ...emptyVitals(), ...(visit.vitals ?? {}) } as Required<VitalSigns>,
    medicalHistory: exam?.medicalHistory ?? '',
    allergy: exam?.allergy ?? prefillAllergy,
    allergyNote: exam?.allergyNote ?? (prefillAllergy ? knownAllergies!.trim() : ''),
    otherRisk: exam?.otherRisk ?? false,
    otherRiskNote: exam?.otherRiskNote ?? '',
    orders: visit.paraclinicalOrders ?? [],
    labNote: exam?.labNote ?? '',
    diagnoses: exam?.diagnoses ?? [],
    prescription: exam?.prescription ?? [],
    advice: exam?.advice ?? '',
    followUpEnabled: exam?.followUpEnabled ?? false,
    followUpDays: exam?.followUpDays ?? 3,
    followUpDate: exam?.followUpDate || addDays(visit.date, exam?.followUpDays ?? 3),
    notes: exam?.notes ?? [],
  }
}

/** Phí công khám theo dịch vụ đang chọn */
export const consultationFeeOf = (serviceId: string) => serviceById(serviceId)?.price ?? 0

/**
 * Phí công khám của lượt: giữ giá đã chốt khi tiếp nhận nếu vẫn là dịch vụ cũ
 * (đổi bảng giá ở Hệ thống không làm thay đổi lượt đã tạo / đã thu), chỉ lấy giá mới khi đổi dịch vụ.
 */
export const visitConsultationFee = (serviceId: string, base: Pick<Visit, 'serviceId' | 'consultationFee'>) =>
  serviceId === base.serviceId && base.consultationFee != null ? base.consultationFee : consultationFeeOf(serviceId)

export const clsTotalOf = (orders: ParaclinicalOrderItem[], payments: PaymentRecord[] = []) => clsCharge(orders, payments)

/** Chuyển bản nháp thành patch cho Visit (store.saveExam tự tính lại phí) */
export function draftToVisitPatch(draft: ExamDraft, base: Visit): Partial<Visit> {
  const exam: ExamRecord = {
    medicalHistory: draft.medicalHistory.trim(),
    allergy: draft.allergy,
    allergyNote: draft.allergyNote.trim(),
    otherRisk: draft.otherRisk,
    otherRiskNote: draft.otherRiskNote.trim(),
    labNote: draft.labNote.trim(),
    diagnoses: draft.diagnoses,
    prescription: draft.prescription,
    advice: draft.advice.trim(),
    prescriptionSentAt: base.exam?.prescriptionSentAt,
    followUpEnabled: draft.followUpEnabled,
    followUpDays: draft.followUpDays,
    followUpDate: draft.followUpEnabled ? draft.followUpDate : '',
    notes: draft.notes,
  }
  const vitals = Object.fromEntries(Object.entries(draft.vitals).filter(([, v]) => v !== '')) as VitalSigns
  return {
    date: draft.date,
    time: draft.time,
    serviceId: draft.serviceId,
    consultationFee: visitConsultationFee(draft.serviceId, base),
    reason: draft.reason.trim(),
    note: draft.note.trim(),
    symptoms: draft.symptoms.trim(),
    vitals,
    paraclinicalOrders: draft.orders,
    exam,
  }
}

/** So sánh bản nháp để biết có thay đổi chưa lưu */
export const serializeDraft = (d: ExamDraft) => JSON.stringify(d)

export function computeBmi(heightCm: string, weightKg: string) {
  const h = Number(heightCm.replace(',', '.')) / 100
  const w = Number(weightKg.replace(',', '.'))
  if (!h || !w) return ''
  return (w / (h * h)).toFixed(1)
}

/** Tổng số lượng thuốc = số ngày × tổng liều trong ngày */
export function computeQuantity(item: Pick<PrescriptionItem, 'days' | 'morning' | 'noon' | 'afternoon' | 'evening'>) {
  const perDay = item.morning + item.noon + item.afternoon + item.evening
  return Math.ceil(item.days * perDay)
}

/** Diễn giải liều để in đơn: "Uống, Sáng: 1 Gói, Chiều: 1 Gói" */
export function doseSummary(item: PrescriptionItem) {
  const parts = (
    [
      ['Sáng', item.morning],
      ['Trưa', item.noon],
      ['Chiều', item.afternoon],
      ['Tối', item.evening],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${label}: ${formatDose(n)} ${item.doseUnit}`)
  return parts.join(', ')
}

export const formatDose = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))
