import { CircleAlert } from 'lucide-react'
import { Checkbox, MoneyField, Segmented, TextArea, TextField, FieldShell, inputBase, inputError } from '@/components/ui/Field'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import {
  CATEGORY_LABEL,
  DOCTORS,
  doctorById,
  PAYMENT_METHOD_LABEL,
  RELATION_LABEL,
  ROOMS,
  SERVICES,
  serviceById,
  SOURCE_LABEL,
  toOptions,
} from '@/store/catalog'
import { ageInYears, ageLabel, nowTime, pad, todayISO } from '@/lib/date'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Gender, GuardianRelation, Patient, PatientInput, VisitCategory, VisitInput } from '@/store/types'

export type Errors = Record<string, string | undefined>

/* ------------------------------------------------------------------ */
/* Thông tin người bệnh                                                */
/* ------------------------------------------------------------------ */

export interface PatientDraft {
  fullName: string
  dob: string
  gender: Gender | ''
  phone: string
  address: string
  guardianName: string
  guardianRelation: GuardianRelation
  insuranceNumber: string
  allergies: string
}

export const emptyPatientDraft = (): PatientDraft => ({
  fullName: '',
  dob: '',
  gender: '',
  phone: '',
  address: '',
  guardianName: '',
  guardianRelation: 'mother',
  insuranceNumber: '',
  allergies: '',
})

export const patientToDraft = (p: Patient): PatientDraft => ({
  fullName: p.fullName,
  dob: p.dob,
  gender: p.gender,
  phone: p.phone,
  address: p.address,
  guardianName: p.guardianName ?? '',
  guardianRelation: p.guardianRelation ?? 'mother',
  insuranceNumber: p.insuranceNumber ?? '',
  allergies: p.allergies ?? '',
})

export const draftToPatientInput = (d: PatientDraft): PatientInput => ({
  fullName: titleCase(d.fullName),
  dob: d.dob,
  gender: d.gender as Gender,
  phone: d.phone.replace(/\D/g, ''),
  address: d.address.trim(),
  guardianName: titleCase(d.guardianName),
  guardianRelation: d.guardianRelation,
  insuranceNumber: d.insuranceNumber.trim().toUpperCase(),
  allergies: d.allergies.trim(),
})

export function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toLocaleUpperCase('vi') + w.slice(1).toLocaleLowerCase('vi') : w))
    .join(' ')
}

export function validatePatient(d: PatientDraft): Errors {
  const e: Errors = {}
  if (d.fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = 'Nhập đầy đủ họ và tên'
  if (!d.dob) e.dob = 'Chọn ngày sinh'
  else if (d.dob > todayISO()) e.dob = 'Ngày sinh không hợp lệ'
  if (!d.gender) e.gender = 'Chọn giới tính'
  if (!/^0\d{9}$/.test(d.phone.replace(/\D/g, ''))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
  if (d.dob && ageInYears(d.dob) < 16 && !d.guardianName.trim()) e.guardianName = 'Bắt buộc với trẻ dưới 16 tuổi'
  if (d.insuranceNumber && !/^[A-Za-z]{2}\d{13}$/.test(d.insuranceNumber.trim())) e.insuranceNumber = 'Mã BHYT gồm 15 ký tự (vd: TE1790123456789)'
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
}

export function PatientFields({ value, onChange, errors }: { value: PatientDraft; onChange: (patch: Partial<PatientDraft>) => void; errors: Errors }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-[18px]">
      <TextField
        label="Họ và tên"
        required
        autoFocus
        wrapperClassName="col-span-2"
        placeholder="VD: Nguyễn Minh Khang"
        value={value.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
        onBlur={() => value.fullName && onChange({ fullName: titleCase(value.fullName) })}
        error={errors.fullName}
      />
      <DatePicker
        label="Ngày sinh"
        required
        value={value.dob}
        max={todayISO()}
        onChange={(dob) => onChange({ dob })}
        error={errors.dob}
      />
      <Segmented
        label="Giới tính"
        required
        value={value.gender}
        options={[
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' },
        ]}
        onChange={(gender) => onChange({ gender })}
        error={errors.gender}
      />
      {value.dob && !errors.dob && <p className="col-span-2 -mt-3 text-[11.5px] text-slate-500">Tuổi hiện tại: <span className="font-medium text-slate-700">{ageLabel(value.dob)}</span></p>}
      <TextField
        label="Điện thoại"
        required
        inputMode="tel"
        placeholder="09xx xxx xxx"
        value={value.phone}
        onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 13) })}
        error={errors.phone}
      />
      <TextField
        label="Số thẻ BHYT"
        placeholder="TE1790..."
        value={value.insuranceNumber}
        onChange={(e) => onChange({ insuranceNumber: e.target.value.toUpperCase().slice(0, 15) })}
        error={errors.insuranceNumber}
      />
      <TextField
        label="Địa chỉ"
        wrapperClassName="col-span-2"
        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
      />
      <TextField
        label="Người giám hộ"
        placeholder="Họ tên bố/mẹ/người thân"
        value={value.guardianName}
        onChange={(e) => onChange({ guardianName: e.target.value })}
        error={errors.guardianName}
      />
      <Select label="Quan hệ" value={value.guardianRelation} options={toOptions(RELATION_LABEL)} onChange={(guardianRelation) => onChange({ guardianRelation })} />
      <TextField
        label="Tiền sử dị ứng"
        wrapperClassName="col-span-2"
        placeholder="Thuốc, thức ăn... (để trống nếu không có)"
        value={value.allergies}
        onChange={(e) => onChange({ allergies: e.target.value })}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Thông tin đăng ký khám                                              */
/* ------------------------------------------------------------------ */

function roundedNow() {
  const [h, m] = nowTime().split(':').map(Number)
  const total = Math.ceil((h * 60 + m) / 5) * 5
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`
}

/** Dịch vụ mặc định: "Khám nhi tổng quát" nếu còn trong bảng giá, không thì dịch vụ đầu tiên (Hệ thống › Tiền công khám có thể xoá/đổi) */
const defaultService = () => serviceById('s1') ?? SERVICES[0]

export const createVisitDraft = (patch: Partial<VisitInput> = {}): VisitInput => ({
  date: todayISO(),
  time: roundedNow(),
  serviceId: defaultService()?.id ?? '',
  fee: defaultService()?.price ?? 0,
  doctorId: 'd1',
  roomId: 'r1',
  category: 'walk_in',
  source: 'direct',
  reason: '',
  note: '',
  checkInNow: true,
  payNow: false,
  payMethod: 'cash',
  ...patch,
})

export function validateVisit(d: VisitInput): Errors {
  const e: Errors = {}
  if (!d.date) e.date = 'Chọn ngày khám'
  else if (d.date < todayISO()) e.date = 'Không thể đăng ký ngày đã qua'
  if (!/^\d{2}:\d{2}$/.test(d.time)) e.time = 'Chọn giờ khám'
  if (!d.serviceId) e.serviceId = 'Chọn dịch vụ'
  if (!d.doctorId) e.doctorId = 'Chọn bác sĩ'
  if (!d.roomId) e.roomId = 'Chọn phòng khám'
  if (!d.reason.trim()) e.reason = 'Nhập lý do khám'
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
}

const SOURCE_BY_CATEGORY: Record<VisitCategory, VisitInput['source']> = { walk_in: 'direct', booked: 'hotline', referral: 'referral' }

export function VisitFields({ value, onChange, errors }: { value: VisitInput; onChange: (patch: Partial<VisitInput>) => void; errors: Errors }) {
  const isFuture = value.date > todayISO()
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-[18px]">
      <DatePicker
        label="Ngày khám"
        required
        value={value.date}
        min={todayISO()}
        onChange={(date) => onChange({ date, checkInNow: date > todayISO() ? false : value.checkInNow })}
        error={errors.date}
      />
      <FieldShell label="Giờ khám" required error={errors.time}>
        <input type="time" className={cn(inputBase, 'tabular-nums', errors.time && inputError)} value={value.time} onChange={(e) => onChange({ time: e.target.value })} />
      </FieldShell>
      <Select
        label="Dịch vụ khám"
        required
        value={value.serviceId}
        options={SERVICES.map((s) => ({ value: s.id, label: s.name, hint: s.price ? formatMoney(s.price) : 'Miễn phí' }))}
        onChange={(serviceId) => onChange({ serviceId, fee: serviceById(serviceId)?.price ?? 0 })}
        error={errors.serviceId}
        menuMinWidth={280}
      />
      <MoneyField label="Phí khám" value={value.fee} onChange={(fee) => onChange({ fee })} />
      <Select
        label="Bác sĩ"
        required
        value={value.doctorId}
        options={DOCTORS.map((d) => ({ value: d.id, label: `${d.title} ${d.name}`, hint: d.specialty }))}
        onChange={(doctorId) => onChange({ doctorId, roomId: doctorById(doctorId)?.defaultRoomId ?? value.roomId })}
        error={errors.doctorId}
        menuMinWidth={320}
      />
      <Select
        label="Phòng khám"
        required
        value={value.roomId}
        options={ROOMS.map((r) => ({ value: r.id, label: r.name, hint: r.floor }))}
        onChange={(roomId) => onChange({ roomId })}
        error={errors.roomId}
      />
      <Select
        label="Phân loại"
        value={value.category}
        options={toOptions(CATEGORY_LABEL)}
        onChange={(category) => onChange({ category, source: SOURCE_BY_CATEGORY[category] })}
      />
      <Select label="Nguồn" value={value.source} options={toOptions(SOURCE_LABEL)} onChange={(source) => onChange({ source })} />
      <TextField
        label="Lý do khám"
        required
        wrapperClassName="col-span-2"
        placeholder="VD: Sốt cao 2 ngày, ho khan"
        value={value.reason}
        onChange={(e) => onChange({ reason: e.target.value })}
        error={errors.reason}
      />
      <TextArea
        label="Ghi chú"
        wrapperClassName="col-span-2"
        rows={2}
        placeholder="Ghi chú cho lễ tân / bác sĩ"
        value={value.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />

      <div className="col-span-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <Checkbox
          checked={value.checkInNow}
          onChange={(checkInNow) => onChange({ checkInNow })}
          label="Tiếp nhận ngay"
          description={isFuture ? 'Lịch hẹn ngày tương lai sẽ ở trạng thái "Đã đăng ký"' : 'Chuyển thẳng vào hàng đợi "Chờ khám"'}
        />
        <div className="flex items-start justify-between gap-3">
          <Checkbox
            checked={value.payNow && value.fee > 0}
            onChange={(payNow) => onChange({ payNow })}
            label={`Thu phí ngay${value.fee ? ` · ${formatMoney(value.fee)}` : ''}`}
            description={value.fee === 0 ? 'Dịch vụ miễn phí' : 'Ghi nhận thanh toán đủ phí khám'}
          />
          {value.payNow && value.fee > 0 && (
            <Select value={value.payMethod} options={toOptions(PAYMENT_METHOD_LABEL)} onChange={(payMethod) => onChange({ payMethod })} className="w-[150px]" triggerClassName="h-8 bg-white" />
          )}
        </div>
        {isFuture && value.checkInNow && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-amber-700">
            <CircleAlert className="h-3.5 w-3.5" /> Ngày khám ở tương lai – nên bỏ chọn “Tiếp nhận ngay”.
          </p>
        )}
      </div>
    </div>
  )
}

export function SectionTitle({ step, title, description }: { step: number; title: string; description?: string }) {
  return (
    <div className="mb-5 flex items-start gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">{step}</span>
      <div>
        <h3 className="text-[13.5px] leading-5 font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  )
}
