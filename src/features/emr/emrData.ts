import { doctorById } from '@/store/catalog'
import { toLocalDateTimeInput, todayISO } from '@/lib/date'
import type { EmrRecord, Patient, SignStatus, Visit } from '@/store/types'

/** Mã bệnh án dạng yy.mm.dd.000STT (ảnh 089) */
export const emrCodeOf = (v: Visit) => `${v.date.slice(2, 4)}.${v.date.slice(5, 7)}.${v.date.slice(8, 10)}.${String(v.queueNumber).padStart(6, '0')}`

export const SIGN_LABEL: Record<SignStatus, string> = { signed: 'Đã ký', pending: 'Đang chờ ký', unsigned: 'Chưa ký' }

export const SUBJECT_LABEL: Record<EmrRecord['subject'], string> = {
  '': 'Chọn một tuỳ chọn',
  insurance: 'BHYT',
  fee: 'Thu phí',
  free: 'Miễn',
  other: 'Khác',
}

/** Bệnh án mặc định lấy từ dữ liệu khám (khi chưa lưu bệnh án) */
export function emrDefaults(visit: Visit, patient: Patient): EmrRecord {
  const exam = visit.exam
  // Lưu dạng giờ địa phương "YYYY-MM-DDTHH:mm" (không lệch múi giờ khi hiển thị / sửa)
  const startIso = visit.startedAt ? toLocalDateTimeInput(visit.startedAt) : `${visit.date}T${visit.time}`
  const endIso = visit.finishedAt ? toLocalDateTimeInput(visit.finishedAt) : startIso
  const dx = exam?.diagnoses ?? []
  const cls = (visit.paraclinicalOrders ?? [])
    .filter((o) => o.resultStatus === 'has_result')
    .map((o) => `${o.name}${o.result?.conclusion ? `: ${o.result.conclusion.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}` : ''}`)
    .join('\n')
  const count = (cat: 'imaging' | 'lab', word?: string) =>
    String((visit.paraclinicalOrders ?? []).filter((o) => o.category === cat && (!word || o.name.toLowerCase().includes(word)) && o.resultStatus === 'has_result').length || '')
  return {
    type: 'outpatient_general',
    specialty: doctorById(visit.doctorId)?.specialty ?? '',
    createdAt: startIso,
    subject: patient.insuranceNumber ? 'insurance' : 'fee',
    insuranceExpiry: '',
    referralDiagnosis: [],
    admissionReason: visit.reason ?? '',
    personalHistory: [exam?.allergy ? `Dị ứng: ${exam.allergyNote || patient.allergies || 'có'}` : '', exam?.otherRisk ? exam.otherRiskNote : ''].filter(Boolean).join('; '),
    familyHistory: '',
    generalExam: visit.symptoms ?? '',
    organExam: '',
    clsSummary: cls,
    initialDiagnosis: dx,
    treatmentGiven: (exam?.prescription ?? []).map((i) => `${i.name} × ${i.days} ngày`).join('; '),
    dischargeDiagnosis: dx,
    treatFrom: startIso.slice(0, 16),
    treatTo: endIso.slice(0, 16),
    summary: {
      course: exam?.medicalHistory ?? '',
      clsValue: cls,
      mainDisease: dx.slice(0, 1),
      comorbid: dx.slice(1),
      method: exam?.prescription.length ? 'Điều trị nội khoa ngoại trú' : '',
      dischargeState: visit.status === 'done' ? 'Ổn định, cho về' : '',
      plan: [exam?.advice, exam?.followUpEnabled && exam.followUpDate ? `Tái khám ngày ${exam.followUpDate.split('-').reverse().join('/')}` : ''].filter(Boolean).join('. '),
      films: { xray: count('imaging', 'x-quang'), ct: count('imaging', 'ct'), ultrasound: count('imaging', 'siêu âm'), lab: count('lab'), total: '' },
    },
    // Lượt đã khám xong từ những ngày trước: bệnh án coi như đã đóng (chưa ký cho tới khi bác sĩ ký)
    closed: visit.status === 'done' && visit.date < todayISO(),
    signStatus: 'unsigned',
  }
}

export const emrOf = (visit: Visit, patient: Patient): EmrRecord => visit.emr ?? emrDefaults(visit, patient)
