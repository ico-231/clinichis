import type { ReactNode } from 'react'
import { CLINIC, doctorLabel, RELATION_LABEL } from '@/store/catalog'
import { formatDiagnosis } from '@/store/icd10'
import { ageInYears, formatDateTimeVN, formatDateVN } from '@/lib/date'
import { formatPhone } from '@/lib/format'
import { emrCodeOf, SUBJECT_LABEL } from './emrData'
import type { EmrRecord, Patient, Visit } from '@/store/types'

const dx = (list: { code: string; name: string }[]) => (list.length ? list.map(formatDiagnosis).join('; ') : '')
const dotted = (v: ReactNode) => (v ? <span>{v}</span> : <span className="tracking-[2px] text-slate-400">..............................</span>)

/** Bản in "Bệnh án ngoại trú" (ảnh 098–101) */
export function EmrPrintDoc({ visit, patient, emr }: { visit: Visit; patient: Patient; emr: EmrRecord }) {
  const v = visit.vitals ?? {}
  const rel = patient.relative
  return (
    <div className="space-y-3 text-[12.5px] leading-6">
      <div className="flex justify-between">
        <div>
          <p>
            Sở y tế: <b>Sở Y tế TP. HCM</b>
          </p>
          <p>
            Cơ sở KB, CB: <b>{CLINIC.name}</b>
          </p>
        </div>
        <div className="text-right">
          <p>Số lưu trữ: {emrCodeOf(visit)}</p>
          <p>Mã y tế: {patient.code}</p>
        </div>
      </div>
      <h1 className="text-center text-lg font-bold uppercase">Bệnh án ngoại trú</h1>
      <p>Khoa: {dotted(emr.specialty)}</p>

      <Heading>I. Hành chính</Heading>
      <ol className="list-decimal space-y-0.5 pl-6">
        <li>
          Họ và tên (in hoa): <b className="uppercase">{patient.fullName}</b>
        </li>
        <li>
          Sinh ngày: {formatDateVN(patient.dob)} &nbsp; Tuổi: {ageInYears(patient.dob, visit.date)}
        </li>
        <li>Giới: {patient.gender === 'male' ? '☒ Nam ☐ Nữ' : '☐ Nam ☒ Nữ'}</li>
        <li>Nghề nghiệp: {dotted(patient.occupation)}</li>
        <li>Dân tộc: {dotted(patient.ethnicity)}</li>
        <li>Ngoại kiều: {patient.nationality && patient.nationality !== 'Việt Nam' ? patient.nationality : dotted('')}</li>
        <li>Địa chỉ: {dotted(patient.address)}</li>
        <li>Nơi làm việc: {dotted('')}</li>
        <li>Đối tượng: {dotted(emr.subject ? SUBJECT_LABEL[emr.subject] : '')}</li>
        <li>
          BHYT giá trị đến ngày: {dotted(emr.insuranceExpiry ? formatDateVN(emr.insuranceExpiry) : '')} &nbsp; Số thẻ BHYT: {dotted(patient.insuranceNumber)}
        </li>
        <li>
          Họ tên, địa chỉ người nhà khi cần báo tin: {dotted([rel?.fullName || patient.guardianName, rel?.relation ? RELATION_LABEL[rel.relation] : '', rel?.address].filter(Boolean).join(' – '))}
          <br />
          Số điện thoại: {dotted(rel?.phone ? formatPhone(rel.phone) : '')}
        </li>
        <li>Đến khám bệnh lúc: {formatDateTimeVN(emr.createdAt)}</li>
        <li>Chẩn đoán của nơi giới thiệu: {dotted(dx(emr.referralDiagnosis))}</li>
      </ol>

      <Heading>II. Lý do vào viện</Heading>
      <p className="whitespace-pre-wrap">{dotted(emr.admissionReason)}</p>

      <Heading>III. Hỏi bệnh</Heading>
      <p>1. Quá trình bệnh lý: {dotted(emr.summary.course)}</p>
      <p>2. Tiền sử bệnh:</p>
      <p className="pl-4">+ Bản thân: {dotted(emr.personalHistory)}</p>
      <p className="pl-4">+ Gia đình: {dotted(emr.familyHistory)}</p>

      <Heading>IV. Khám bệnh</Heading>
      <div className="grid grid-cols-[1fr_220px] gap-3">
        <p>1. Toàn thân: {dotted(emr.generalExam)}</p>
        <div className="border border-black px-2 py-1 text-[12px]">
          <p>Mạch: {v.pulse || '....'} lần/ph</p>
          <p>Nhiệt độ: {v.temperatureC || '....'} °C</p>
          <p>
            Huyết áp: {v.bpSystolic || '...'}/{v.bpDiastolic || '...'} mmHg
          </p>
          <p>Nhịp thở: {v.respiratoryRate || '....'} lần/ph</p>
          <p>Cân nặng: {v.weightKg || '....'} kg</p>
        </div>
      </div>
      <p>2. Các bộ phận: {dotted(emr.organExam)}</p>
      <p>3. Tóm tắt kết quả cận lâm sàng: {dotted(emr.clsSummary)}</p>
      <p>4. Chẩn đoán ban đầu: {dotted(dx(emr.initialDiagnosis))}</p>
      <p>5. Đã xử lý (thuốc, chăm sóc...): {dotted(emr.treatmentGiven)}</p>
      <p>6. Chẩn đoán khi ra viện: {dotted(dx(emr.dischargeDiagnosis))}</p>
      <p>
        7. Điều trị ngoại trú từ ngày: {formatDateTimeVN(emr.treatFrom)} &nbsp; đến ngày: {formatDateTimeVN(emr.treatTo)}
      </p>

      <Heading>C. Tổng kết bệnh án</Heading>
      <div className="space-y-1 border border-black p-2">
        <p>1. Quá trình bệnh lý và diễn biến lâm sàng: {dotted(emr.summary.course)}</p>
        <p>2. Tóm tắt kết quả xét nghiệm cận lâm sàng có giá trị chẩn đoán: {dotted(emr.summary.clsValue)}</p>
        <p>3. Chẩn đoán ra viện:</p>
        <p className="pl-4">+ Bệnh chính: {dotted(dx(emr.summary.mainDisease))}</p>
        <p className="pl-4">+ Bệnh kèm theo: {dotted(dx(emr.summary.comorbid))}</p>
        <p>4. Phương pháp điều trị: {dotted(emr.summary.method)}</p>
        <p>5. Tình trạng người bệnh ra viện: {dotted(emr.summary.dischargeState)}</p>
        <p>6. Hướng điều trị và các chế độ tiếp theo: {dotted(emr.summary.plan)}</p>
      </div>

      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="border border-black py-1" colSpan={2}>
              Hồ sơ, phim, ảnh
            </th>
          </tr>
          <tr>
            <th className="border border-black py-1">Loại hồ sơ</th>
            <th className="w-24 border border-black py-1">Số hồ sơ</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['X-Quang', emr.summary.films.xray],
              ['CT Scanner', emr.summary.films.ct],
              ['Siêu âm', emr.summary.films.ultrasound],
              ['Xét nghiệm', emr.summary.films.lab],
              ['Toàn bộ hồ sơ', emr.summary.films.total],
            ] as const
          ).map(([k, n]) => (
            <tr key={k}>
              <td className="border border-black px-2 py-0.5">{k}</td>
              <td className="border border-black px-2 py-0.5 text-center">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-4 pt-2 text-center text-[12px]">
        <div>
          <p className="font-bold">Người giao hồ sơ</p>
          <p className="mt-10">..................</p>
        </div>
        <div>
          <p className="font-bold">Người nhận hồ sơ</p>
          <p className="mt-10">..................</p>
        </div>
        <div>
          <p className="italic">Ngày {formatDateVN(visit.date)}</p>
          <p className="font-bold">Bác sĩ điều trị</p>
          <p className="mt-8 font-bold">{doctorLabel(visit.doctorId)}</p>
          {emr.signStatus === 'signed' && <p className="text-[11px] text-emerald-700">(Đã ký số {emr.signedAt ? formatDateTimeVN(emr.signedAt) : ''})</p>}
        </div>
      </div>
    </div>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <p className="font-bold uppercase">{children}</p>
}
