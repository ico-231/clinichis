import { useState, type ReactNode } from 'react'
import { ChevronUp, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox, FieldShell, inputBase } from '@/components/ui/Field'
import { TimeInput } from '@/components/ui/TimeInput'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { GENDER_LABEL, SERVICES } from '@/store/catalog'
import { addDays, formatDateTimeVN, formatDateVN, parseISODate } from '@/lib/date'
import { formatNumber, formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PatientFormDrawer } from '../patients/PatientFormDrawer'
import { computeBmi, type ExamDraft } from './examDraft'
import type { Patient } from '@/store/types'

export type DraftUpdate = (patch: Partial<ExamDraft>) => void

export const boxInput =
  'w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] text-ink outline-none transition placeholder:text-ink-3/60 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15'

/* ------------------------------------------------------------------ */
/* Khung section                                                       */
/* ------------------------------------------------------------------ */

export function Section({
  id,
  title,
  right,
  collapsible = true,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  right?: ReactNode
  collapsible?: boolean
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <section id={id} className={cn('scroll-mt-3 rounded-[16px] border border-line bg-surface px-5 py-4', className)}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="text-[14.5px] font-bold text-brand-ink">{title}</h2>
        <div className="flex items-center gap-2">
          {right}
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-1 text-ink-3 hover:bg-subtle hover:text-ink"
              aria-label={open ? 'Thu gọn' : 'Mở rộng'}
              aria-expanded={open}
            >
              <ChevronUp className={cn('h-4 w-4 transition-transform', !open && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
      {open && <div className="mt-2.5">{children}</div>}
    </section>
  )
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1 block text-[13px] font-medium text-ink-2">
      {children}
      {required && <span className="ml-0.5 text-accent-ink">*</span>}
    </span>
  )
}

export function TextBox({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(boxInput, 'resize-y py-2 leading-5')}
      />
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Thông tin lượt khám + người bệnh                                    */
/* ------------------------------------------------------------------ */

export function InfoSection({ draft, update, patient }: { draft: ExamDraft; update: DraftUpdate; patient: Patient }) {
  const [editOpen, setEditOpen] = useState(false)
  const rel = patient.relative
  const relativeName = rel?.fullName || patient.guardianName
  const info: [string, ReactNode][] = [
    ['Họ và tên', <span className="font-semibold uppercase">{patient.fullName}</span>],
    ['Ngày sinh', formatDateVN(patient.dob)],
    ['Điện thoại', formatPhone(patient.phone)],
  ]
  return (
    <>
      <section id="sec-info" className="scroll-mt-3 rounded-[16px] border border-line bg-surface px-5 pt-5 pb-4">
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-[1fr_1fr_1.4fr]">
          <DatePicker label="Ngày khám" required value={draft.date} onChange={(date) => update({ date })} />
          <FieldShell label="Giờ khám" required>
            <TimeInput value={draft.time} onChange={(time) => update({ time })} className={inputBase} aria-label="Giờ khám" />
          </FieldShell>
          <Select
            label="Công khám"
            required
            value={draft.serviceId}
            options={SERVICES.map((s) => ({ value: s.id, label: `${s.name} (${formatNumber(s.price)} đ)` }))}
            onChange={(serviceId) => update({ serviceId })}
          />
        </div>
      </section>

      <Section
        title="Thông tin"
        collapsible={false}
        right={
          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
            Chỉnh sửa
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-y-1.5 text-[13px] lg:grid-cols-[1.4fr_1fr_1fr]">
          <dl className="grid grid-cols-[88px_1fr] gap-y-1.5">
            {info.map(([k, v]) => (
              <InfoRow key={k} label={k} value={v} />
            ))}
          </dl>
          <dl className="grid grid-cols-[88px_1fr] content-start gap-y-1.5">
            <InfoRow label="Giới tính" value={GENDER_LABEL[patient.gender]} />
            <InfoRow label="CCCD" value={patient.cccd || '—'} />
            <InfoRow label="Mã BHYT" value={patient.insuranceNumber || '—'} />
          </dl>
          <dl className="grid grid-cols-[88px_1fr] content-start gap-y-1.5 lg:border-l lg:border-line lg:pl-4">
            <InfoRow label="Người thân" value={relativeName ? <span className="font-semibold uppercase">{relativeName}</span> : '—'} />
            <InfoRow label="Điện thoại" value={rel?.phone ? formatPhone(rel.phone) : '—'} />
            {patient.allergies && <InfoRow label="Dị ứng" value={<span className="font-medium text-danger-ink">{patient.allergies}</span>} />}
          </dl>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextBox
            label="Lý do khám"
            value={draft.reason}
            onChange={(reason) => update({ reason })}
            placeholder="Vấn đề sức khỏe hoặc triệu chứng khiến người bệnh đến khám."
          />
          <TextBox label="Ghi chú lượt khám" value={draft.note} onChange={(note) => update({ note })} placeholder="Ghi chú" />
        </div>
      </Section>

      {editOpen && <PatientFormDrawer patient={patient} onClose={() => setEditOpen(false)} />}
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-ink-4">{label}</dt>
      <dd className="min-w-0 text-ink">{value}</dd>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Sinh hiệu, hỏi bệnh, yếu tố rủi ro, lâm sàng                        */
/* ------------------------------------------------------------------ */

const VITALS: { key: keyof ExamDraft['vitals']; label: string; unit: string; required?: boolean }[] = [
  { key: 'heightCm', label: 'Chiều cao', unit: 'cm', required: true },
  { key: 'weightKg', label: 'Cân nặng', unit: 'kg', required: true },
  { key: 'temperatureC', label: 'Nhiệt độ', unit: '°C' },
]
const VITALS_2: { key: keyof ExamDraft['vitals']; label: string; unit: string }[] = [
  { key: 'pulse', label: 'Mạch', unit: 'lần/phút' },
  { key: 'respiratoryRate', label: 'Nhịp thở', unit: 'lần/phút' },
  { key: 'spo2', label: 'SpO2', unit: '%' },
]

export function ClinicalSections({ draft, update, vitalErrors }: { draft: ExamDraft; update: DraftUpdate; vitalErrors: Set<string> }) {
  const setVital = (key: keyof ExamDraft['vitals'], raw: string) => {
    const value = raw.replace(/[^\d.,]/g, '')
    const vitals = { ...draft.vitals, [key]: value }
    if (key === 'heightCm' || key === 'weightKg') vitals.bmi = computeBmi(vitals.heightCm, vitals.weightKg)
    update({ vitals })
  }
  const vitalInput = (key: keyof ExamDraft['vitals'], unit: string, extra?: string) => (
    <input
      value={draft.vitals[key]}
      inputMode="decimal"
      placeholder={unit}
      aria-label={unit}
      onChange={(e) => setVital(key, e.target.value)}
      className={cn(boxInput, 'h-9 border-b-2 tabular-nums', vitalErrors.has(key) && 'border-danger! bg-danger-soft/60', extra)}
    />
  )

  return (
    <>
      <Section id="sec-clinical" title="Chỉ số sinh hiệu">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.7fr)_repeat(4,minmax(0,1fr))]">
          {VITALS.map((v) => (
            <label key={v.key} className="block">
              <Label required={v.required}>{v.label}</Label>
              {vitalInput(v.key, v.unit)}
            </label>
          ))}
          <div>
            <Label>Huyết áp (mmHg)</Label>
            <div className="flex items-center gap-1">
              {vitalInput('bpSystolic', 'Tâm thu', 'px-2')}
              <span className="text-ink-5">/</span>
              {vitalInput('bpDiastolic', 'Tâm trương', 'px-2')}
            </div>
          </div>
          {VITALS_2.map((v) => (
            <label key={v.key} className="block">
              <Label>{v.label}</Label>
              {vitalInput(v.key, v.unit)}
            </label>
          ))}
          <label className="block">
            <Label>BMI</Label>
            <input value={draft.vitals.bmi} readOnly placeholder="kg/m²" className={cn(boxInput, 'h-9 bg-canvas tabular-nums')} />
          </label>
        </div>
      </Section>

      <Section title="Hỏi bệnh">
        <TextBox label="Quá trình bệnh lý" value={draft.medicalHistory} onChange={(medicalHistory) => update({ medicalHistory })} />
      </Section>

      <Section title="Yếu tố rủi ro">
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
          <RiskRow
            label="Dị ứng"
            checked={draft.allergy}
            note={draft.allergyNote}
            onCheck={(allergy) => update({ allergy })}
            onNote={(allergyNote) => update({ allergyNote, allergy: allergyNote ? true : draft.allergy })}
          />
          <RiskRow
            label="Khác"
            checked={draft.otherRisk}
            note={draft.otherRiskNote}
            onCheck={(otherRisk) => update({ otherRisk })}
            onNote={(otherRiskNote) => update({ otherRiskNote, otherRisk: otherRiskNote ? true : draft.otherRisk })}
          />
        </div>
      </Section>

      <Section title="Lâm sàng">
        <TextBox label="Triệu chứng" value={draft.symptoms} onChange={(symptoms) => update({ symptoms })} />
      </Section>
    </>
  )
}

function RiskRow({
  label,
  checked,
  note,
  onCheck,
  onNote,
}: {
  label: string
  checked: boolean
  note: string
  onCheck: (v: boolean) => void
  onNote: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-4">
      <Checkbox checked={checked} onChange={onCheck} label={label} className="w-20 shrink-0" />
      <input
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Ghi chú"
        aria-label={`Ghi chú ${label.toLowerCase()}`}
        className="h-8 w-full px-3 rounded-[10px] border border-line-strong bg-surface text-[13px] text-ink outline-none transition placeholder:text-ink-5 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hẹn tái khám                                                        */
/* ------------------------------------------------------------------ */

const daysBetween = (from: string, to: string) => Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000)

export function FollowUpSection({ draft, update }: { draft: ExamDraft; update: DraftUpdate }) {
  return (
    <Section id="sec-followup" title="Hẹn khám">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink">
        <Checkbox checked={draft.followUpEnabled} onChange={(followUpEnabled) => update({ followUpEnabled })} label="Tái khám sau" className="items-center" />
        <input
          type="number"
          min={1}
          max={365}
          value={draft.followUpDays}
          onChange={(e) => {
            const followUpDays = Math.max(1, Math.min(365, Number(e.target.value) || 1))
            update({ followUpDays, followUpDate: addDays(draft.date, followUpDays), followUpEnabled: true })
          }}
          className="h-8 w-16 rounded-md border border-line px-2 text-center text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          aria-label="Số ngày tái khám"
        />
        <span>ngày.</span>
        <DatePicker
          value={draft.followUpDate}
          min={addDays(draft.date, 1)}
          onChange={(followUpDate) =>
            update({ followUpDate, followUpDays: Math.max(1, daysBetween(draft.date, followUpDate)), followUpEnabled: true })
          }
          className="w-[160px]"
        />
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Ghi chú cho người bệnh                                              */
/* ------------------------------------------------------------------ */

export function NotesSection({ draft, update }: { draft: ExamDraft; update: DraftUpdate }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim()
    if (!t) return
    update({ notes: [...draft.notes, { id: `note_${Date.now().toString(36)}`, text: t, at: new Date().toISOString() }] })
    setText('')
  }
  return (
    <Section id="sec-notes" title="Ghi chú">
      {draft.notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-3 text-[13px] text-ink-4">
          Chưa có ghi chú nào. Bạn có thể thêm ghi chú cho người bệnh bằng hộp thoại bên dưới.
        </p>
      ) : (
        <ul className="space-y-2">
          {draft.notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-3 rounded-md bg-warn-tint/60 px-3 py-2 text-[13px]">
              <span className="flex-1 whitespace-pre-wrap text-ink">{n.text}</span>
              <span className="shrink-0 text-xs text-ink-4">{formatDateTimeVN(n.at)}</span>
              <button
                type="button"
                onClick={() => update({ notes: draft.notes.filter((x) => x.id !== n.id) })}
                className="shrink-0 text-xs text-ink-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger-ink"
              >
                Xoá
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập nội dung ghi chú"
          aria-label="Nội dung ghi chú người bệnh"
          className={cn(boxInput, 'resize-y py-2')}
        />
        <Button variant="outline" onClick={add} disabled={!text.trim()}>
          Thêm
        </Button>
      </div>
    </Section>
  )
}
