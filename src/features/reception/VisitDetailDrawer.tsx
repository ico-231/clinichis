import { useState, type ReactNode } from 'react'
import { Ban, Check, Pencil, Phone, Printer, ShieldAlert, Stethoscope, Wallet } from 'lucide-react'
import { Drawer } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { TextArea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { PaymentStatusBadge, PatientTypeTag, VisitStatusBadge } from '@/components/clinic/StatusBadges'
import { paidAmount, remainingAmount, useClinicActions, useClinicState } from '@/store/ClinicStore'
import { usePatientVisits } from '@/store/selectors'
import { CATEGORY_LABEL, doctorLabel, GENDER_LABEL, PAYMENT_METHOD_LABEL, RELATION_LABEL, roomById, serviceById, SOURCE_LABEL } from '@/store/catalog'
import { ageLabel, formatDateTimeVN, formatDateVN } from '@/lib/date'
import { formatMoney, formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { draftToPatientInput, PatientFields, patientToDraft, validatePatient, type Errors, type PatientDraft } from './forms'
import { NEXT_STEP, STEP_LABEL } from './visitFlow'
import { CheckInTicket } from '@/components/clinic/CheckInTicket'
import type { Visit } from '@/store/types'

type Tab = 'visit' | 'patient' | 'payment' | 'history'

interface Props {
  visitId: string | null
  onClose: () => void
  onOpenVisit: (id: string) => void
  onPay: (id: string) => void
  onCancel: (id: string) => void
}

export function VisitDetailDrawer(props: Props) {
  if (!props.visitId) return null
  return <DetailContent {...props} visitId={props.visitId} />
}

function DetailContent({ visitId, onClose, onOpenVisit, onPay, onCancel }: Props & { visitId: string }) {
  const { visits, patients } = useClinicState()
  const { setVisitStatus, openExam } = useClinicActions()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('visit')
  const [ticketOpen, setTicketOpen] = useState(false)
  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  const history = usePatientVisits(patient?.id)
  if (!visit || !patient) return null

  const step = NEXT_STEP[visit.status]
  const remaining = remainingAmount(visit)
  const canPay = visit.status !== 'cancelled' && remaining > 0
  const canCancel = visit.status !== 'done' && visit.status !== 'cancelled'

  return (
    <Drawer
      open
      onClose={onClose}
      width="w-[600px]"
      title={patient.fullName}
      headerExtra={
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-500">
          <span>{patient.code}</span>·<span>{GENDER_LABEL[patient.gender]}</span>·<span>{ageLabel(patient.dob)}</span>·
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {formatPhone(patient.phone)}
          </span>
          <PatientTypeTag type={visit.patientType} />
        </div>
      }
    >
      <div className="px-4">
        {patient.allergies && (
          <p className="mb-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
            <ShieldAlert className="h-4 w-4" /> <span className="font-semibold">Dị ứng:</span> {patient.allergies}
          </p>
        )}

        {/* Thẻ STT */}
        <div className="flex items-stretch gap-3 rounded-xl border border-slate-200 p-3">
          <div className="flex w-[72px] flex-col items-center justify-center rounded-lg bg-blue-600 text-white">
            <span className="text-[10px] font-medium tracking-wider uppercase opacity-80">STT</span>
            <span className="text-2xl leading-tight font-bold tabular-nums">{String(visit.queueNumber).padStart(2, '0')}</span>
          </div>
          <div className="min-w-0 flex-1 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{visit.code}</span>
              <VisitStatusBadge status={visit.status} />
              <PaymentStatusBadge status={visit.paymentStatus} />
            </div>
            <p className="mt-1 text-slate-600">
              {formatDateVN(visit.date)} · {visit.time} · {roomById(visit.roomId)?.name}
            </p>
            <p className="text-slate-600">{doctorLabel(visit.doctorId)}</p>
          </div>
        </div>

        <Stepper visit={visit} />

        {/* Thao tác */}
        <div className="mt-3 flex flex-wrap gap-2">
          {step && (
            <Button
              size="sm"
              leftIcon={<step.icon className="h-3.5 w-3.5" />}
              onClick={() => {
                setVisitStatus(visit.id, step.to)
                toast({ title: `${patient.fullName} ${STEP_LABEL[visit.status]}`, description: `${visit.code} · STT ${visit.queueNumber}` })
              }}
            >
              {step.label}
            </Button>
          )}
          {visit.status === 'in_progress' && (
            <Button size="sm" leftIcon={<Stethoscope className="h-3.5 w-3.5" />} onClick={() => openExam(visit.id)}>
              Mở màn khám
            </Button>
          )}
          {canPay && (
            <Button size="sm" variant="success" leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => onPay(visit.id)}>
              Thu tiền · {formatMoney(remaining)}
            </Button>
          )}
          <Button size="sm" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => setTicketOpen(true)}>
            In phiếu tiếp nhận
          </Button>
          {canCancel && (
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => onCancel(visit.id)}>
              Huỷ lượt
            </Button>
          )}
        </div>

        <Tabs
          className="mt-5"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'visit', label: 'Lượt khám' },
            { value: 'patient', label: 'Hành chính' },
            { value: 'payment', label: 'Thanh toán', count: visit.payments.length },
            { value: 'history', label: 'Lịch sử khám', count: history.length },
          ]}
        />
        <div className="py-4">
          {tab === 'visit' && <VisitTab key={visit.id} visit={visit} />}
          {tab === 'patient' && <PatientTab key={patient.id} patientId={patient.id} />}
          {tab === 'payment' && <PaymentTab visit={visit} />}
          {tab === 'history' && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => h.id !== visit.id && onOpenVisit(h.id)}
                    className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left text-[12.5px]', h.id === visit.id ? 'bg-blue-50/60' : 'hover:bg-slate-50')}
                  >
                    <span className="w-[84px] shrink-0 text-slate-700 tabular-nums">
                      {formatDateVN(h.date)}
                      <span className="block text-[11px] text-slate-500">{h.time}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">{serviceById(h.serviceId)?.name}</span>
                      <span className="block truncate text-slate-500">{h.reason}</span>
                    </span>
                    <VisitStatusBadge status={h.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {ticketOpen && <CheckInTicket visitId={visit.id} onClose={() => setTicketOpen(false)} />}
    </Drawer>
  )
}

function Stepper({ visit }: { visit: Visit }) {
  const steps = [
    { label: 'Đăng ký', at: visit.createdAt },
    { label: 'Chờ khám', at: visit.checkedInAt },
    { label: 'Đang khám', at: visit.startedAt },
    { label: 'Đã khám', at: visit.finishedAt },
  ]
  const order = ['registered', 'waiting', 'in_progress', 'done']
  const current = order.indexOf(visit.status)
  const cancelled = visit.status === 'cancelled'
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1">
      {steps.map((s, i) => {
        const reached = cancelled ? !!s.at : i <= current
        return (
          <li key={s.label} className="min-w-0">
            <div className={cn('h-1 rounded-full', reached ? (cancelled ? 'bg-slate-300' : 'bg-blue-600') : 'bg-slate-100')} />
            <p className={cn('mt-1.5 flex items-center gap-1 text-[11.5px] font-medium', reached ? 'text-slate-800' : 'text-slate-400')}>
              {reached && <Check className="h-3 w-3" />}
              {s.label}
            </p>
            <p className="truncate text-[10.5px] text-slate-500">{s.at ? formatDateTimeVN(s.at).slice(0, 5) : '—'}</p>
          </li>
        )
      })}
    </ol>
  )
}

function InfoGrid({ items }: { items: { label: string; value: ReactNode; full?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
      {items.map((it) => (
        <div key={it.label} className={cn(it.full && 'col-span-2')}>
          <dt className="text-[11.5px] text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 text-slate-900">{it.value || <span className="text-slate-300">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

function VisitTab({ visit }: { visit: Visit }) {
  const { updateVisit } = useClinicActions()
  const toast = useToast()
  const [note, setNote] = useState(visit.note)
  const dirty = note.trim() !== visit.note
  const vt = visit.vitals
  const hasVitals =
    vt &&
    Boolean(
      vt.heightCm || vt.weightKg || vt.temperatureC || vt.bpSystolic || vt.pulse || vt.respiratoryRate || vt.spo2,
    )
  const clsOrders = visit.paraclinicalOrders ?? []

  return (
    <div className="space-y-5">
      <InfoGrid
        items={[
          { label: 'Công khám', value: `${serviceById(visit.serviceId)?.name ?? 'Mặc định'} (${formatMoney(visit.consultationFee ?? visit.fee)})` },
          { label: 'Tổng chi phí (TT)', value: formatMoney(visit.fee) },
          { label: 'Bác sĩ', value: doctorLabel(visit.doctorId) },
          { label: 'Phòng khám', value: `${roomById(visit.roomId)?.name} · ${roomById(visit.roomId)?.floor}` },
          { label: 'Phân loại', value: CATEGORY_LABEL[visit.category] },
          { label: 'Nguồn', value: SOURCE_LABEL[visit.source] },
          { label: 'Lý do khám', value: visit.reason, full: true },
          ...(visit.symptoms ? [{ label: 'Triệu chứng', value: visit.symptoms, full: true }] : []),
          ...(visit.cancelReason ? [{ label: 'Lý do huỷ', value: <span className="text-red-600">{visit.cancelReason}</span>, full: true }] : []),
        ]}
      />

      {hasVitals && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-[11.5px] font-semibold tracking-wide text-slate-600 uppercase">Chỉ số sinh hiệu</p>
          <div className="grid grid-cols-4 gap-2 text-[12.5px]">
            {vt?.heightCm && <div><span className="text-slate-400">Cao:</span> <span className="font-medium">{vt.heightCm} cm</span></div>}
            {vt?.weightKg && <div><span className="text-slate-400">Nặng:</span> <span className="font-medium">{vt.weightKg} kg</span></div>}
            {vt?.bmi && <div><span className="text-slate-400">BMI:</span> <span className="font-medium">{vt.bmi} kg/m²</span></div>}
            {vt?.temperatureC && <div><span className="text-slate-400">Nhiệt độ:</span> <span className="font-medium">{vt.temperatureC} °C</span></div>}
            {(vt?.bpSystolic || vt?.bpDiastolic) && (
              <div><span className="text-slate-400">HA:</span> <span className="font-medium">{vt.bpSystolic || '—'}/{vt.bpDiastolic || '—'} mmHg</span></div>
            )}
            {vt?.pulse && <div><span className="text-slate-400">Mạch:</span> <span className="font-medium">{vt.pulse} l/p</span></div>}
            {vt?.respiratoryRate && <div><span className="text-slate-400">Nhịp thở:</span> <span className="font-medium">{vt.respiratoryRate} l/p</span></div>}
            {vt?.spo2 && <div><span className="text-slate-400">SpO2:</span> <span className="font-medium">{vt.spo2}%</span></div>}
          </div>
        </div>
      )}

      {clsOrders.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-[11.5px] font-semibold tracking-wide text-slate-600 uppercase">
            Chỉ định cận lâm sàng ({clsOrders.length})
          </p>
          <ul className="divide-y divide-slate-100 text-[12.5px]">
            {clsOrders.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-2 py-1.5">
                <div>
                  <p className="font-medium text-slate-900">
                    {o.name} <span className="text-slate-400">x{o.quantity}</span>
                  </p>
                  <p className="text-[11.5px] text-slate-500">{o.providerName}</p>
                  {o.instruction && <p className="text-[11.5px] text-blue-600">HD: {o.instruction}</p>}
                </div>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {formatMoney(o.unitPrice * o.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <TextArea label="Ghi chú" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thêm ghi chú cho lượt khám" />
        {dirty && (
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setNote(visit.note)}>
              Hoàn tác
            </Button>
            <Button
              size="sm"
              onClick={() => {
                updateVisit(visit.id, { note: note.trim() })
                toast({ title: 'Đã lưu ghi chú' })
              }}
            >
              Lưu ghi chú
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function PatientTab({ patientId }: { patientId: string }) {
  const { patients } = useClinicState()
  const { updatePatient } = useClinicActions()
  const toast = useToast()
  const patient = patients.find((p) => p.id === patientId)!
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PatientDraft>(() => patientToDraft(patient))
  const [errors, setErrors] = useState<Errors>({})

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const errs = validatePatient(draft)
          setErrors(errs)
          if (Object.keys(errs).length) return
          updatePatient(patient.id, draftToPatientInput(draft))
          setEditing(false)
          toast({ title: 'Đã cập nhật hồ sơ người bệnh', description: 'Thay đổi áp dụng cho mọi màn hình dùng chung dữ liệu.' })
        }}
        className="pt-2"
      >
        <PatientFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
            Huỷ
          </Button>
          <Button size="sm" type="submit">
            Lưu hồ sơ
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Pencil className="h-3.5 w-3.5" />}
          onClick={() => {
            setDraft(patientToDraft(patient))
            setErrors({})
            setEditing(true)
          }}
        >
          Sửa hồ sơ
        </Button>
      </div>
      <InfoGrid
        items={[
          { label: 'Mã người bệnh', value: patient.code },
          { label: 'Ngày tạo hồ sơ', value: formatDateVN(patient.createdAt.slice(0, 10)) },
          { label: 'Ngày sinh', value: `${formatDateVN(patient.dob)} (${ageLabel(patient.dob)})` },
          { label: 'Giới tính', value: GENDER_LABEL[patient.gender] },
          { label: 'Điện thoại', value: formatPhone(patient.phone) },
          { label: 'CCCD', value: patient.cccd },
          { label: 'Số thẻ BHYT', value: patient.insuranceNumber },
          { label: 'Nhóm máu', value: patient.bloodType },
          { label: 'Dân tộc / Quốc tịch', value: [patient.ethnicity, patient.nationality].filter(Boolean).join(' · ') },
          { label: 'Người giám hộ', value: patient.guardianName ? `${patient.guardianName} (${RELATION_LABEL[patient.guardianRelation ?? 'other']})` : '' },
          { label: 'Tiền sử dị ứng', value: patient.allergies || 'Không ghi nhận' },
          { label: 'Địa chỉ', value: patient.address, full: true },
        ]}
      />
    </div>
  )
}

function PaymentTab({ visit }: { visit: Visit }) {
  const paid = paidAmount(visit)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Phí khám', value: visit.fee, cls: 'text-slate-900' },
          { label: 'Đã thu (thuần)', value: paid, cls: 'text-emerald-700' },
          { label: 'Còn lại', value: visit.status === 'cancelled' ? 0 : remainingAmount(visit), cls: 'text-orange-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 px-3 py-2.5">
            <p className="text-[11.5px] text-slate-500">{s.label}</p>
            <p className={cn('mt-0.5 text-[15px] font-semibold tabular-nums', s.cls)}>{formatMoney(s.value)}</p>
          </div>
        ))}
      </div>
      {visit.payments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-[12.5px] text-slate-500">Chưa có giao dịch</p>
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 font-medium">Thời gian</th>
              <th className="py-2 font-medium">Loại</th>
              <th className="py-2 font-medium">Hình thức</th>
              <th className="py-2 text-right font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {visit.payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-700 tabular-nums">{formatDateTimeVN(p.at)}</td>
                <td className="py-2">
                  <span className={p.kind === 'payment' ? 'text-emerald-700' : 'text-violet-700'}>{p.kind === 'payment' ? 'Thu tiền' : 'Hoàn tiền'}</span>
                  {p.note && <span className="block text-[11px] text-slate-500">{p.note}</span>}
                </td>
                <td className="py-2 text-slate-700">{PAYMENT_METHOD_LABEL[p.method]}</td>
                <td className={cn('py-2 text-right font-medium tabular-nums', p.kind === 'refund' ? 'text-violet-700' : 'text-slate-900')}>
                  {p.kind === 'refund' ? '−' : ''}
                  {formatMoney(p.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
