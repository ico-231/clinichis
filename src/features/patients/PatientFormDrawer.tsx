import { useEffect, useState, type ReactNode } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { findDuplicatePatients } from '@/store/patientRules'
import { BLOOD_TYPES, ETHNICITIES, NATIONALITIES, OCCUPATIONS, PROVINCES } from '@/store/administrativeCatalog'
import { RELATION_LABEL, toOptions } from '@/store/catalog'
import { addDays, ageInYears, formatDateVN, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Gender, GuardianRelation, Patient, PatientInput } from '@/store/types'
import { useControlLabel } from '@/lib/useControlLabel'

interface Form {
  fullName: string
  phone: string
  cccd: string
  insuranceNumber: string
  dob: string
  gender: Gender
  nationality: string
  province: string
  ward: string
  streetAddress: string
  email: string
  bloodType: string
  occupation: string
  ethnicity: string
  allergies: string
  hasRelative: boolean
  relName: string
  relPhone: string
  relDob: string
  relGender: Gender
  relRelation: GuardianRelation
  relAddress: string
}

const fromPatient = (p?: Patient): Form => ({
  fullName: p?.fullName ?? '',
  phone: p?.phone ?? '',
  cccd: p?.cccd ?? '',
  insuranceNumber: p?.insuranceNumber ?? '',
  dob: p?.dob ?? '',
  gender: p?.gender ?? 'male',
  nationality: p?.nationality ?? 'Việt Nam',
  province: p?.province ?? '',
  ward: p?.ward ?? '',
  streetAddress: p?.streetAddress ?? (p && !p.province ? p.address : ''),
  email: p?.email ?? '',
  bloodType: p?.bloodType ?? '',
  occupation: p?.occupation ?? '',
  ethnicity: p?.ethnicity ?? 'Kinh',
  allergies: p?.allergies ?? '',
  hasRelative: Boolean(p?.relative?.fullName || p?.guardianName),
  relName: p?.relative?.fullName ?? p?.guardianName ?? '',
  relPhone: p?.relative?.phone ?? '',
  relDob: p?.relative?.dob ?? '',
  relGender: p?.relative?.gender ?? 'female',
  relRelation: p?.relative?.relation ?? p?.guardianRelation ?? 'mother',
  relAddress: p?.relative?.address ?? '',
})

const upperName = (s: string) => s.replace(/\s+/g, ' ').trimStart().toLocaleUpperCase('vi')

function validate(f: Form) {
  const e: Record<string, string> = {}
  if (f.fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = 'Nhập đầy đủ họ và tên'
  if (!/^0\d{9}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
  if (f.cccd && !/^\d{12}$/.test(f.cccd.trim())) e.cccd = 'CCCD gồm 12 chữ số'
  if (f.insuranceNumber && !/^[A-Za-z]{2}\d{13}$/.test(f.insuranceNumber.trim())) e.insuranceNumber = 'Mã BHYT gồm 15 ký tự (vd: TE1790123456789)'
  if (!f.dob) e.dob = 'Chọn ngày sinh'
  else if (f.dob > todayISO()) e.dob = 'Ngày sinh không hợp lệ'
  if (!f.province) e.province = 'Chọn tỉnh/thành phố'
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Email không hợp lệ'
  if (f.hasRelative) {
    if (!f.relName.trim()) e.relName = 'Nhập họ tên người thân'
    if (f.relPhone && !/^0\d{9}$/.test(f.relPhone.replace(/\D/g, ''))) e.relPhone = 'Số điện thoại gồm 10 chữ số'
  } else if (f.dob && ageInYears(f.dob) < 16) {
    e.relName = 'Người bệnh dưới 16 tuổi cần thông tin người thân'
  }
  return e
}

function toInput(f: Form): PatientInput {
  const address = [f.streetAddress.trim(), f.ward, f.province].filter(Boolean).join(', ')
  const rel = f.hasRelative
    ? { fullName: upperName(f.relName).trim(), phone: f.relPhone.replace(/\D/g, ''), dob: f.relDob, gender: f.relGender, relation: f.relRelation, address: f.relAddress.trim() }
    : undefined
  return {
    fullName: upperName(f.fullName).trim(),
    phone: f.phone.replace(/\D/g, ''),
    dob: f.dob,
    gender: f.gender,
    address,
    cccd: f.cccd.trim(),
    insuranceNumber: f.insuranceNumber.trim().toUpperCase(),
    nationality: f.nationality,
    province: f.province,
    ward: f.ward,
    streetAddress: f.streetAddress.trim(),
    email: f.email.trim(),
    bloodType: f.bloodType,
    occupation: f.occupation,
    ethnicity: f.ethnicity,
    allergies: f.allergies.trim(),
    relative: rel,
    guardianName: rel?.fullName,
    guardianRelation: rel?.relation,
  }
}

/** Ngăn phải Thêm / Chỉnh sửa người bệnh (ảnh 106, 107, 116) */
export function PatientFormDrawer({ patient, onClose, onSaved }: { patient?: Patient; onClose: () => void; onSaved?: (p: Patient) => void }) {
  useOverlayBehavior(true, onClose)
  const { addPatient, updatePatient } = useClinicActions()
  const { patients } = useClinicState()
  const [dupAck, setDupAck] = useState<string | null>(null)
  const toast = useToast()
  const [f, setF] = useState<Form>(() => fromPatient(patient))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [ageUnit, setAgeUnit] = useState<'year' | 'month'>('year')
  const set = (p: Partial<Form>) => setF((cur) => ({ ...cur, ...p }))
  const wards = PROVINCES.find((p) => p.name === f.province)?.wards ?? []

  useEffect(() => {
    if (submitted) setErrors(validate(f))
  }, [f, submitted])

  const save = () => {
    setSubmitted(true)
    const e = validate(f)
    setErrors(e)
    if (Object.keys(e).length) return
    const input = toInput(f)
    // Cảnh báo trùng hồ sơ (cùng họ tên + ngày sinh / SĐT); bấm Lưu lần nữa với cùng thông tin là vẫn lưu
    const dup = findDuplicatePatients(patients, input, patient?.id)[0]
    const signature = `${input.fullName}|${input.dob}|${input.phone}`
    if (dup && dupAck !== signature) {
      setDupAck(signature)
      toast({
        title: 'Có thể trùng hồ sơ đã có',
        description: `${dup.code} · ${dup.fullName} · ${formatDateVN(dup.dob)}. Kiểm tra lại; bấm Lưu lần nữa nếu vẫn muốn lưu.`,
        tone: 'warning',
      })
      return
    }
    if (patient) {
      updatePatient(patient.id, input)
      toast({ title: 'Đã cập nhật thông tin người bệnh', description: input.fullName, tone: 'success' })
      onSaved?.({ ...patient, ...input })
    } else {
      const created = addPatient(input)
      toast({ title: 'Đã thêm người bệnh', description: `${created.fullName} · ${created.code}`, tone: 'success' })
      onSaved?.(created)
    }
    onClose()
  }

  const age = f.dob ? (ageUnit === 'year' ? ageInYears(f.dob) : Math.max(0, Math.floor((Date.parse(todayISO()) - Date.parse(f.dob)) / (30.44 * 86_400_000)))) : ''

  return (
    <Portal>
      <div className="fixed inset-0 z-50 animate-fade-in bg-overlay/45" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside role="dialog" aria-modal="true" aria-label={patient ? 'Chỉnh sửa thông tin người bệnh' : 'Thêm người bệnh'} className="absolute top-0 right-0 bottom-0 flex w-[min(420px,100vw)] animate-slide-in-right flex-col bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">{patient ? 'Chỉnh sửa thông tin người bệnh' : 'Thêm người bệnh'}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-4 hover:bg-subtle" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="thin-scroll flex-1 space-y-3.5 overflow-y-auto px-4 py-3">
            <Input label="Họ và tên" required value={f.fullName} onChange={(v) => set({ fullName: upperName(v) })} placeholder="HỌ VÀ TÊN" error={errors.fullName} autoFocus />
            <Input label="Điện thoại" required value={f.phone} onChange={(v) => set({ phone: v.replace(/[^\d\s]/g, '') })} placeholder="Số điện thoại liên hệ" error={errors.phone} inputMode="tel" />
            <Input label="CCCD" value={f.cccd} onChange={(v) => set({ cccd: v.replace(/\D/g, '').slice(0, 12) })} placeholder="Số CCCD" error={errors.cccd} />
            <Input label="Mã BHYT" value={f.insuranceNumber} onChange={(v) => set({ insuranceNumber: v.toUpperCase().slice(0, 15) })} placeholder="Mã BHYT" error={errors.insuranceNumber} />
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <DatePicker label="Ngày sinh" required value={f.dob} max={todayISO()} onChange={(dob) => set({ dob })} error={errors.dob} />
              <div>
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-3">Tuổi</span>
                <div className="flex h-9 overflow-hidden rounded-md border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                  <input
                    value={age}
                    inputMode="numeric"
                    placeholder="tuổi"
                    aria-label="Tuổi"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ''))
                      if (!e.target.value) return set({ dob: '' })
                      const today = todayISO()
                      set({ dob: ageUnit === 'year' ? `${Number(today.slice(0, 4)) - n}-01-01` : addDays(today, -Math.round(n * 30.44)) })
                    }}
                    className="w-full min-w-0 px-2 text-[13px] outline-none"
                  />
                  <select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value as 'year' | 'month')} className="border-l border-line bg-canvas px-1 text-[12.5px]" aria-label="Đơn vị tuổi">
                    <option value="year">tuổi</option>
                    <option value="month">tháng</option>
                  </select>
                </div>
              </div>
            </div>
            <Field label="Giới tính">
              <div className="flex gap-10 text-[13px]">
                {(['male', 'female'] as const).map((g) => (
                  <label key={g} className="flex cursor-pointer items-center gap-1.5">
                    <input type="radio" checked={f.gender === g} onChange={() => set({ gender: g })} className="accent-brand" />
                    {g === 'male' ? 'Nam' : 'Nữ'}
                  </label>
                ))}
              </div>
            </Field>
            <Select label="Quốc gia" value={f.nationality} options={NATIONALITIES.map((n) => ({ value: n, label: n }))} onChange={(nationality) => set({ nationality })} />
            <Select label="Tỉnh/Thành phố" required value={f.province} placeholder="Chọn tỉnh/thành phố" options={PROVINCES.map((p) => ({ value: p.name, label: p.name }))} onChange={(province) => set({ province, ward: '' })} error={errors.province} />
            <Select label="Phường/Xã" value={f.ward} placeholder="Chọn phường/xã" options={wards.map((w) => ({ value: w, label: w }))} onChange={(ward) => set({ ward })} disabled={!wards.length} />
            <Input label="Địa chỉ" value={f.streetAddress} onChange={(streetAddress) => set({ streetAddress })} placeholder="Số nhà, tên đường...." />
            <Input label="Email" value={f.email} onChange={(email) => set({ email })} placeholder="Email" error={errors.email} />
            <Select label="Nhóm máu" value={f.bloodType} placeholder="Chọn nhóm máu" options={BLOOD_TYPES.map((b) => ({ value: b, label: b }))} onChange={(bloodType) => set({ bloodType })} />
            <Select label="Nghề nghiệp" value={f.occupation} placeholder="Nghề nghiệp" options={OCCUPATIONS.map((o) => ({ value: o, label: o }))} onChange={(occupation) => set({ occupation })} />
            <Select label="Dân tộc" value={f.ethnicity} options={ETHNICITIES.map((e) => ({ value: e, label: e }))} onChange={(ethnicity) => set({ ethnicity })} />
            <Input label="Dị ứng" value={f.allergies} onChange={(allergies) => set({ allergies })} placeholder="Thuốc / thức ăn gây dị ứng (nếu có)" />

            <div className="rounded-lg border border-line">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[12px] font-bold tracking-wide text-ink uppercase">Thông tin người thân</span>
                <button type="button" onClick={() => set({ hasRelative: !f.hasRelative })} className="flex items-center gap-1 text-[12px] font-semibold text-brand-ink uppercase">
                  {f.hasRelative ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {f.hasRelative ? 'Bỏ' : 'Thêm'}
                </button>
              </div>
              {errors.relName && !f.hasRelative && <p className="px-3 pb-2 text-xs text-danger-ink">{errors.relName}</p>}
              {f.hasRelative && (
                <div className="space-y-3 border-t border-line-soft px-3 py-3">
                  <Input label="Họ và tên" required value={f.relName} onChange={(v) => set({ relName: upperName(v) })} placeholder="HỌ VÀ TÊN" error={errors.relName} />
                  <Input label="Điện thoại" value={f.relPhone} onChange={(v) => set({ relPhone: v.replace(/[^\d\s]/g, '') })} placeholder="Số điện thoại" error={errors.relPhone} />
                  <DatePicker label="Ngày sinh" value={f.relDob} max={todayISO()} onChange={(relDob) => set({ relDob })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Giới tính" value={f.relGender} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }]} onChange={(relGender) => set({ relGender })} />
                    <Select label="Mối quan hệ" value={f.relRelation} options={toOptions(RELATION_LABEL)} onChange={(relRelation) => set({ relRelation })} />
                  </div>
                  <Input label="Địa chỉ" value={f.relAddress} onChange={(relAddress) => set({ relAddress })} placeholder="Số nhà, tên đường...." />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end border-t border-line-soft px-4 py-2.5">
            <Button onClick={save}>
              Lưu
            </Button>
          </div>
        </aside>
      </div>
    </Portal>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  const { ref, labelId, errorId } = useControlLabel<HTMLSpanElement>(error)
  return (
    <div>
      <span ref={ref} id={labelId} className="mb-1.5 block text-[12.5px] font-medium text-ink-3">
        {label}
        {required && <span className="ml-0.5 text-danger-ink">*</span>}
      </span>
      {children}
      {error && <span id={errorId} className="mt-1 block text-xs text-danger-ink">{error}</span>}
    </div>
  )
}

function Input({
  label,
  required,
  value,
  onChange,
  placeholder,
  error,
  autoFocus,
  inputMode,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  autoFocus?: boolean
  inputMode?: 'tel' | 'numeric'
}) {
  return (
    <Field label={label} required={required} error={error}>
      <input
        value={value}
        autoFocus={autoFocus}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn('h-9 w-full rounded-md border px-3 text-[13px] outline-none placeholder:text-ink-4 focus:ring-2 focus:ring-brand/15', error ? 'border-danger' : 'border-line focus:border-brand')}
      />
    </Field>
  )
}
