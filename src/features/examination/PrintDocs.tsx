import type { ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { CLINIC, doctorLabel, GENDER_LABEL } from '@/store/catalog'
import { formatDiagnosis } from '@/store/icd10'
import { ageLabel, formatDateVN } from '@/lib/date'
import { formatPhone } from '@/lib/format'
import { doseSummary, formatDose, type ExamDraft } from './examDraft'
import type { Patient, Visit } from '@/store/types'

/** Xem trước bản in. Nút "In" gọi hộp thoại in của trình duyệt (chỉ in vùng .print-area). */
export function PrintPreviewModal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      bodyClassName="bg-subtle"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            In
          </Button>
        </>
      }
    >
      <div className="print-area mx-auto max-w-[720px] bg-surface px-10 py-8 font-doc text-[13.5px] leading-6 text-black shadow-sm">{children}</div>
    </Modal>
  )
}

function DocHeader({ title, codeLabel, code }: { title: string; codeLabel: string; code: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold uppercase">{CLINIC.name}</p>
          <p className="text-[12.5px]">{CLINIC.address}</p>
          <p className="text-[12.5px]">Điện thoại: {CLINIC.hotline}</p>
        </div>
        <p className="text-right text-[12.5px]">
          {codeLabel}: <b>{code}</b>
        </p>
      </div>
      <h1 className="my-5 text-center text-xl font-bold uppercase">{title}</h1>
    </>
  )
}

/** Tuổi tính theo ngày khám (in lại đơn cũ vẫn đúng tuổi lúc khám) */
function PatientBlock({ patient, draft, date }: { patient: Patient; draft: ExamDraft; date: string }) {
  const v = draft.vitals
  return (
    <div className="grid grid-cols-3 gap-x-4 text-[13px]">
      <p className="col-span-2">
        Họ và tên: <b className="uppercase">{patient.fullName}</b>
      </p>
      <p>Giới tính: {GENDER_LABEL[patient.gender]}</p>
      <p className="col-span-2">
        Ngày sinh: {formatDateVN(patient.dob)} ({ageLabel(patient.dob, date)})
      </p>
      <p>Cân nặng: {v.weightKg ? `${v.weightKg} kg` : '—'}</p>
      <p className="col-span-2">Điện thoại: {formatPhone(patient.phone)}</p>
      <p>Nhiệt độ: {v.temperatureC ? `${v.temperatureC} °C` : '—'}</p>
      <p className="col-span-3">Địa chỉ: {patient.address || '—'}</p>
      {(patient.relative?.fullName || patient.guardianName) && (
        <p className="col-span-3">Người giám hộ: {patient.relative?.fullName || patient.guardianName}</p>
      )}
    </div>
  )
}

function Signature({ visit, label }: { visit: Visit; label: string }) {
  return (
    <div className="mt-6 flex justify-end">
      <div className="w-64 text-center">
        <p className="italic">Ngày {formatDateVN(visit.date)}</p>
        <p className="font-bold">{label}</p>
        <p className="mt-14 font-bold">{doctorLabel(visit.doctorId)}</p>
      </div>
    </div>
  )
}

export function PrescriptionDoc({ visit, patient, draft }: { visit: Visit; patient: Patient; draft: ExamDraft }) {
  return (
    <>
      <DocHeader title="Đơn thuốc" codeLabel="Mã đơn thuốc" code={visit.code} />
      <PatientBlock patient={patient} draft={draft} date={visit.date} />
      <p className="mt-1 text-[13px]">
        Chẩn đoán: <b>{draft.diagnoses.length ? draft.diagnoses.map(formatDiagnosis).join('; ') : '—'}</b>
      </p>
      <table className="mt-4 w-full text-[13px]">
        <thead>
          <tr className="border-b border-black">
            <th className="w-10 py-1 text-left">STT</th>
            <th className="py-1 text-left">Tên thuốc – Cách dùng</th>
            <th className="w-24 py-1 text-right">SL</th>
          </tr>
        </thead>
        <tbody>
          {draft.prescription.map((it, i) => (
            <tr key={it.id} className="align-top">
              <td className="py-1.5">{i + 1}</td>
              <td className="py-1.5">
                <b>{it.name}</b> <span className="text-[12px]">({it.activeIngredient})</span>
                <br />
                {doseSummary(it)} × {it.days} ngày
                {it.usage && (
                  <>
                    <br />
                    <i>Ghi chú: {it.usage}</i>
                  </>
                )}
              </td>
              <td className="py-1.5 text-right">
                {formatDose(it.quantity)} {it.quantityUnit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3">Lời dặn: {draft.advice || '—'}</p>
      {draft.followUpEnabled && <p>Ngày tái khám: {formatDateVN(draft.followUpDate)}</p>}
      <Signature visit={visit} label="Bác sĩ" />
      <p className="mt-4 border-t border-dashed border-black pt-2 text-[12px] italic">Đơn thuốc chỉ dùng trong lượt khám này, người bệnh không tự ý mua dùng thêm.</p>
    </>
  )
}

export function OrderSheetDoc({ visit, patient, draft }: { visit: Visit; patient: Patient; draft: ExamDraft }) {
  return (
    <>
      <DocHeader title="Phiếu chỉ định" codeLabel="Mã chỉ định" code={visit.code} />
      <PatientBlock patient={patient} draft={draft} date={visit.date} />
      <p className="mt-1 text-[13px]">Chẩn đoán: {draft.diagnoses.length ? draft.diagnoses.map(formatDiagnosis).join('; ') : '—'}</p>
      <table className="mt-4 w-full text-[13px]">
        <thead>
          <tr className="border-b border-black">
            <th className="w-10 py-1 text-left">STT</th>
            <th className="py-1 text-left">Dịch vụ</th>
            <th className="w-16 py-1 text-right">SL</th>
          </tr>
        </thead>
        <tbody>
          {draft.orders.map((o, i) => (
            <tr key={o.id} className="align-top">
              <td className="py-1.5">{i + 1}</td>
              <td className="py-1.5">
                <b>{o.name}</b>
                <br />
                <span className="text-[12px]">Nơi thực hiện: {o.providerName}</span>
                {o.instruction && (
                  <>
                    <br />
                    <i className="text-[12px]">Hướng dẫn: {o.instruction}</i>
                  </>
                )}
              </td>
              <td className="py-1.5 text-right">{String(o.quantity).padStart(2, '0')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {draft.labNote && <p className="mt-3">Ghi chú cho phòng lab: {draft.labNote}</p>}
      <Signature visit={visit} label="Bác sĩ chỉ định" />
    </>
  )
}
