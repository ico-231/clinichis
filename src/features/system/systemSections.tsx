import { useMemo, useState, type ReactNode } from 'react'
import { Eye, EyeOff, Lock, MoreHorizontal, Pencil, PlusCircle, Trash2, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { DatePicker } from '@/components/ui/DatePicker'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { DOCTORS, roomById, SERVICES } from '@/store/catalog'
import { PARACLINICAL_PROVIDERS } from '@/store/paraclinicalCatalog'
import { PROVINCES } from '@/store/administrativeCatalog'
import { formatDateTimeVN, formatDateVN, todayISO } from '@/lib/date'
import { formatNumber, initials, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ImagePick, defaultProfile } from '../clinic-info/ClinicInfoPage'
import { SIGN_LABEL } from '../emr/emrData'
import { defaultSystem } from '@/store/systemDefaults'
import { localDate } from '../reports/reportData'
import type { OrgItem, Service, SignStatus, StaffMember, SystemSettings } from '@/store/types'
import { useControlLabel } from '@/lib/useControlLabel'

const input = 'h-9 w-full rounded-[10px] border border-line-strong bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-canvas disabled:text-ink-4'
const SIGN_PROVIDERS = ['Viettel', 'VNPT', 'FPT', 'BKAV']
const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function useSystem() {
  const { system } = useClinicState()
  const { setSystem } = useClinicActions()
  const sys = system ?? defaultSystem()
  return [sys, (fn: (s: SystemSettings) => SystemSettings) => setSystem(fn(sys))] as const
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  const { ref, labelId, errorId } = useControlLabel<HTMLSpanElement>(error)
  return (
    <div>
      <span ref={ref} id={labelId} className="mb-1 block text-[12.5px] font-medium text-ink-2">
        {label}
        {required && <span className="text-accent-ink">*</span>}
      </span>
      {children}
      {error ? <span id={errorId} className="mt-1 block text-xs text-accent-ink">{error}</span> : hint && <span className="mt-1 block text-[11.5px] text-ink-3">{hint}</span>}
    </div>
  )
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-2.5 text-[13px] text-ink-2', disabled && 'opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-line-strong')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      {label}
    </label>
  )
}

function SubTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-2">
      <p className="text-[14.5px] font-bold text-ink">{title}</p>
      {desc && <p className="text-[12.5px] text-ink-3">{desc}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Thông tin phòng khám (155)                                          */
/* ------------------------------------------------------------------ */

export function ClinicSection() {
  const { clinicProfile } = useClinicState()
  const { setClinicProfile } = useClinicActions()
  const toast = useToast()
  const base = clinicProfile ?? defaultProfile()
  const [f, setF] = useState({ logo: base.logo, clinicName: base.clinicName, phone: base.phone, email: base.email, province: base.province, ward: base.ward, address: base.address })
  const [touched, setTouched] = useState(false)
  const wards = PROVINCES.find((p) => p.name === f.province)?.wards ?? []
  const err = {
    clinicName: !f.clinicName.trim() ? 'Nhập tên đơn vị' : '',
    phone: !/^0\d{9,10}$|^1[89]00\d{4,6}$/.test(f.phone.replace(/\s/g, '')) ? 'Số điện thoại không hợp lệ' : '',
    email: f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? 'Email không hợp lệ' : '',
    address: !f.address.trim() ? 'Nhập địa chỉ' : '',
  }
  const save = () => {
    setTouched(true)
    if (Object.values(err).some(Boolean)) return
    setClinicProfile({ ...base, ...f, clinicName: f.clinicName.trim(), phone: f.phone.replace(/\s/g, ''), address: f.address.trim() })
    toast({ title: 'Đã cập nhật thông tin phòng khám', description: 'Áp dụng cho các bản in (đơn thuốc, phiếu thu...)', tone: 'success' })
  }
  return (
    <div className="max-w-[560px] space-y-3">
      <Field label="Logo / Hình đại diện">
        <ImagePick value={f.logo} onChange={(logo) => setF((x) => ({ ...x, logo }))} hint=".png, .jpeg dung lượng tối đa 5MB" />
      </Field>
      <Field label="Tên đơn vị / Phòng khám" required error={touched ? err.clinicName : ''}>
        <input value={f.clinicName} onChange={(e) => setF((x) => ({ ...x, clinicName: e.target.value }))} className={input} />
      </Field>
      <Field label="Điện thoại" required error={touched ? err.phone : ''}>
        <input value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} className={input} />
      </Field>
      <Field label="Email" error={touched ? err.email : ''}>
        <input value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} className={input} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tỉnh/Thành phố" required>
          <select value={f.province} onChange={(e) => setF((x) => ({ ...x, province: e.target.value, ward: '' }))} className={input}>
            {PROVINCES.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Phường/Xã">
          <select value={f.ward} onChange={(e) => setF((x) => ({ ...x, ward: e.target.value }))} className={input}>
            <option value="">Chọn phường/xã</option>
            {wards.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Địa chỉ" required error={touched ? err.address : ''}>
        <input value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} className={input} />
      </Field>
      <Button onClick={save}>Cập nhật</Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tài khoản cá nhân (156–157)                                         */
/* ------------------------------------------------------------------ */

export function AccountSection() {
  const [sys, update] = useSystem()
  const toast = useToast()
  const [a, setA] = useState(sys.account)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [pwErr, setPwErr] = useState('')
  const saveAccount = () => {
    if (!a.lastName.trim() || !a.firstName.trim() || !/^\S+@\S+\.\S+$/.test(a.email)) return toast({ title: 'Kiểm tra email, họ và tên', tone: 'warning' })
    update((s) => ({ ...s, account: { ...a, lastName: a.lastName.trim(), firstName: a.firstName.trim() } }))
    toast({ title: 'Đã cập nhật tài khoản', tone: 'success' })
  }
  const changePw = () => {
    if (!pw.current) return setPwErr('Nhập mật khẩu hiện tại')
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) return setPwErr('Mật khẩu mới tối thiểu 8 ký tự, gồm cả chữ và số')
    if (pw.next === pw.current) return setPwErr('Mật khẩu mới phải khác mật khẩu hiện tại')
    if (pw.next !== pw.confirm) return setPwErr('Xác nhận mật khẩu không khớp')
    setPwErr('')
    setPw({ current: '', next: '', confirm: '' })
    toast({ title: 'Đã kiểm tra mật khẩu hợp lệ', description: 'Bản demo không có máy chủ nên mật khẩu không được lưu.', tone: 'info' })
  }
  const pwInput = (k: keyof typeof pw, label: string, ph: string) => (
    <Field label={label}>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={pw[k]} onChange={(e) => setPw((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} autoComplete="new-password" className={cn(input, 'pr-9')} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-4 hover:text-ink" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  )
  return (
    <div className="max-w-[560px] space-y-3">
      <Field label="Ảnh đại diện">
        <div className="flex items-center gap-3">
          {a.avatar ? (
            <img src={a.avatar} alt="Ảnh đại diện" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent-line bg-accent-soft text-lg font-bold text-accent-ink">{initials(`${a.lastName} ${a.firstName}`)}</span>
          )}
          <ImagePick value={undefined} onChange={(avatar) => setA((x) => ({ ...x, avatar }))} hint="Hỗ trợ định dạng PNG, JPEG dung lượng không quá 10Mb" />
        </div>
      </Field>
      <Field label="Email" required>
        <input value={a.email} onChange={(e) => setA((x) => ({ ...x, email: e.target.value }))} className={input} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Họ và tên đệm" required>
          <input value={a.lastName} onChange={(e) => setA((x) => ({ ...x, lastName: e.target.value }))} className={input} />
        </Field>
        <Field label="Tên" required>
          <input value={a.firstName} onChange={(e) => setA((x) => ({ ...x, firstName: e.target.value }))} className={input} />
        </Field>
      </div>
      <SignFields value={a} onChange={(p) => setA((x) => ({ ...x, ...p }))} />
      <Button onClick={saveAccount}>Cập nhật</Button>

      <div className="border-t border-line pt-4">
        <SubTitle title="Thay đổi mật khẩu" />
        <div className="space-y-3">
          {pwInput('current', 'Mật khẩu hiện tại', 'Mật khẩu hiện tại')}
          {pwInput('next', 'Mật khẩu mới', 'Mật khẩu mới')}
          {pwInput('confirm', 'Xác nhận mật khẩu mới', 'Xác nhận mật khẩu mới')}
          {pwErr && <p className="text-xs text-accent-ink">{pwErr}</p>}
          <Button onClick={changePw}>Đổi mật khẩu</Button>
        </div>
      </div>
    </div>
  )
}

function SignFields({ value, onChange }: { value: { signProvider: string; signUsername: string; alwaysSignExam?: boolean; requireSignRx?: boolean }; onChange: (p: Partial<SystemSettings['account']>) => void }) {
  return (
    <div className="space-y-2.5">
      <SubTitle title="Chữ ký số" desc="Cài đặt chữ ký số để xác thực danh tính trong các văn bản điện tử (bệnh án, toa thuốc...), đảm bảo tính toàn vẹn dữ liệu và giá trị pháp lý." />
      <Field label="Đơn vị cung cấp">
        <select value={value.signProvider} onChange={(e) => onChange({ signProvider: e.target.value })} className={input.replace('w-full', 'w-[180px]')}>
          {SIGN_PROVIDERS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Tên đăng nhập">
        <input value={value.signUsername} onChange={(e) => onChange({ signUsername: e.target.value })} placeholder="Nhập tên đăng nhập dịch vụ ký số" className={input} />
      </Field>
      {value.alwaysSignExam !== undefined && (
        <>
          <Switch label="Luôn yêu cầu ký số khi hoàn thành khám bệnh." checked={!!value.alwaysSignExam} disabled={!value.signUsername} onChange={(alwaysSignExam) => onChange({ alwaysSignExam })} />
          <Switch label="Bắt buộc ký số đơn thuốc khi hoàn thành tư vấn trực tuyến." checked={!!value.requireSignRx} disabled={!value.signUsername} onChange={(requireSignRx) => onChange({ requireSignRx })} />
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Giao diện (158)                                                     */
/* ------------------------------------------------------------------ */

export function AppearanceSection() {
  const { ui } = useClinicState()
  const { setUI } = useClinicActions()
  const theme = ui.theme ?? 'light'
  const options = [
    { value: 'system' as const, label: 'Hệ thống' },
    { value: 'light' as const, label: 'Sáng' },
    { value: 'dark' as const, label: 'Tối' },
  ]
  return (
    <div className="space-y-4">
      <SubTitle title="Giao diện" />
      <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Giao diện">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={theme === o.value} onClick={() => setUI({ theme: o.value })} className="text-left">
            <span className={cn('block h-[88px] w-[132px] overflow-hidden rounded-[12px] border-2 p-1 transition-colors', theme === o.value ? 'border-brand' : 'border-line')}>
              <ThemeThumb mode={o.value} />
            </span>
            <span className={cn('mt-1.5 block text-[13px]', theme === o.value ? 'font-semibold text-brand-ink' : 'text-ink-2')}>{o.label}</span>
          </button>
        ))}
      </div>
      <Field label="Ngôn ngữ" hint="Chọn ngôn ngữ hiển thị.">
        <select value="vi" onChange={() => {}} className={input.replace('w-full', 'w-[200px]')}>
          <option value="vi">Tiếng Việt</option>
        </select>
      </Field>
    </div>
  )
}

/** Hình thu nhỏ của từng giao diện: màu cố định (không theo token) để luôn xem trước đúng sáng / tối */
function ThemeThumb({ mode }: { mode: 'system' | 'light' | 'dark' }) {
  const panel = (dark: boolean) => (
    <span className={cn('flex h-full flex-1 flex-col gap-1 p-1', dark ? 'bg-[#121110]' : 'bg-[#faf9f7]')}>
      <span className={cn('flex h-2 items-center gap-0.5 rounded-sm px-0.5', dark ? 'bg-[#1c1a18]' : 'bg-white')}>
        <span className={cn('h-1 w-1 rounded-full', dark ? 'bg-[#5dd3c3]' : 'bg-[#0f766e]')} />
      </span>
      <span className={cn('flex-1 rounded-sm border', dark ? 'border-[#33302b] bg-[#1c1a18]' : 'border-[#e7e5e4] bg-white')} />
    </span>
  )
  return <span className="flex h-full overflow-hidden rounded-[8px]">{mode === 'system' ? (<>{panel(false)}{panel(true)}</>) : panel(mode === 'dark')}</span>
}

/* ------------------------------------------------------------------ */
/* Cài đặt chung (159)                                                 */
/* ------------------------------------------------------------------ */

export function GeneralSection() {
  const [sys, update] = useSystem()
  const { setDefaultProvider } = useClinicActions()
  const toast = useToast()
  const [g, setG] = useState(sys.general)
  const [rxPw, setRxPw] = useState('')
  const exampleCode = `${g.codePrefix || 'YMD'}${todayISO().replace(/-/g, '')}${String(1).padStart(Math.max(3, g.codeMinLength - 1), '0')}`
  const save = () => {
    if (!/^[a-z0-9_]{3,20}$/.test(g.accountPrefix)) return toast({ title: 'Mã tài khoản gồm 3–20 ký tự a-z, 0-9, _', tone: 'warning' })
    if (!/^[A-Za-z]{1,5}$/.test(g.codePrefix)) return toast({ title: 'Tiền tố gồm 1–5 chữ cái', tone: 'warning' })
    update((s) => ({ ...s, general: { ...g, codePrefix: g.codePrefix.toUpperCase() } }))
    setDefaultProvider(g.defaultLabId)
    setRxPw('')
    toast({ title: 'Đã lưu cài đặt chung', description: `Mã mới sẽ có dạng ${exampleCode.toUpperCase()}`, tone: 'success' })
  }
  return (
    <div className="max-w-[560px] space-y-3">
      <Field label="Mã tài khoản" required hint={`Ký tự đặt trước tên đăng nhập của nhân viên. Tên đăng nhập có dạng: ${g.accountPrefix || '[mã tài khoản]'}_admin`}>
        <input value={g.accountPrefix} onChange={(e) => setG((x) => ({ ...x, accountPrefix: e.target.value.toLowerCase() }))} className={input} />
      </Field>
      <Field label="Bật/Tắt in phiếu khám" hint="In phiếu khám ngay sau khi bấm Đăng ký khám.">
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" checked={g.printTicketOnCheckIn} onChange={(e) => setG((x) => ({ ...x, printTicketOnCheckIn: e.target.checked }))} className="h-4 w-4 accent-brand" />
          Bật
        </label>
      </Field>
      <Field label="Đặt phòng lab mặc định">
        <select value={g.defaultLabId} onChange={(e) => setG((x) => ({ ...x, defaultLabId: e.target.value }))} className={input}>
          {PARACLINICAL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.address})
            </option>
          ))}
        </select>
      </Field>
      <div className="border-t border-line pt-3">
        <SubTitle title="Liên thông đơn thuốc" desc="Quản lý thông tin liên thông đơn thuốc quốc gia (mô phỏng – chưa kết nối)." />
        <div className="space-y-2.5">
          <Field label="Mã bảo hiểm" hint="Mã bảo hiểm của cơ sở.">
            <input value={g.rxInsuranceCode} onChange={(e) => setG((x) => ({ ...x, rxInsuranceCode: e.target.value }))} className={input} />
          </Field>
          <Field label="Mã liên thông cơ sở">
            <input value={g.rxFacilityCode} onChange={(e) => setG((x) => ({ ...x, rxFacilityCode: e.target.value }))} className={input} />
          </Field>
          <Field label="Mật khẩu" hint="Không lưu mật khẩu trong bản demo.">
            <input type="password" value={rxPw} onChange={(e) => setRxPw(e.target.value)} autoComplete="off" className={input} />
          </Field>
        </div>
      </div>
      <div className="border-t border-line pt-3">
        <SubTitle title="Tiền tố" desc="Mã tiền tố hỗ trợ việc quản lý và ghi nhớ đơn hàng dễ dàng hơn." />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tiền tố mặc định" required>
            <input value={g.codePrefix} onChange={(e) => setG((x) => ({ ...x, codePrefix: e.target.value.toUpperCase() }))} className={input} />
          </Field>
          <Field label="Độ dài tối thiểu">
            <input type="number" min={4} max={11} value={g.codeMinLength} onChange={(e) => setG((x) => ({ ...x, codeMinLength: Math.min(11, Math.max(4, Number(e.target.value) || 8)) }))} className={cn(input, 'tabular-nums')} />
          </Field>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-3">
          Tiền tố mặc định dùng cho mã khám, mã phiếu thu phát sinh mới. VD: <b className="text-ink tabular-nums">{exampleCode.toUpperCase()}</b>
        </p>
      </div>
      <Button onClick={save}>Lưu thay đổi</Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Danh sách đơn giản có Thêm / Điều chỉnh / Xoá                        */
/* ------------------------------------------------------------------ */

function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: string[]
  rows: { key: string; cells: ReactNode[]; actions?: ReactNode }[]
  empty?: string
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <table className="w-full text-[13px]">
        <thead className="border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold">
                {h}
              </th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length + 1}>
                <EmptyState title={empty ?? 'Không có dữ liệu'} />
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key} className="transition-colors hover:bg-brand-wash">
              {r.cells.map((c, i) => (
                <td key={i} className="px-3 py-2.5 text-ink">
                  {c}
                </td>
              ))}
              <td className="px-2 py-2.5 text-right">{r.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RowMenu({ items }: { items: { label: string; icon: ReactNode; onSelect: () => void; danger?: boolean }[] }) {
  return (
    <DropdownMenu
      align="end"
      renderTrigger={({ ref, toggle }) => (
        <button ref={ref} type="button" onClick={toggle} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-subtle" aria-label="Thao tác">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {items.map((i) => (
        <MenuItem key={i.label} icon={i.icon} danger={i.danger} onSelect={i.onSelect}>
          {i.label}
        </MenuItem>
      ))}
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------------ */
/* Cơ cấu tổ chức (160–167)                                            */
/* ------------------------------------------------------------------ */

type OrgKey = keyof SystemSettings['org'] | 'doctors'
const ORG_TABS: { value: OrgKey; label: string; noun: string }[] = [
  { value: 'specialties', label: 'Chuyên khoa', noun: 'chuyên khoa' },
  { value: 'areas', label: 'Khu khám', noun: 'khu khám' },
  { value: 'rooms', label: 'Phòng', noun: 'phòng' },
  { value: 'doctors', label: 'Bác sĩ', noun: 'bác sĩ' },
  { value: 'visitTypes', label: 'Loại hình khám', noun: 'loại hình khám' },
  { value: 'subjects', label: 'Đối tượng khám', noun: 'đối tượng khám' },
]

export function OrgSection() {
  const [sys, update] = useSystem()
  const toast = useToast()
  const [tab, setTab] = useState<OrgKey>('specialties')
  const [edit, setEdit] = useState<{ item: OrgItem; isNew: boolean } | null>(null)
  const [del, setDel] = useState<OrgItem | null>(null)
  const meta = ORG_TABS.find((t) => t.value === tab)!
  const list = tab === 'doctors' ? [] : sys.org[tab]
  const openNew = () => tab !== 'doctors' && setEdit({ item: { id: newId('org'), name: '', description: '', updatedAt: '' }, isNew: true })
  const saveItem = (it: OrgItem) => {
    if (tab === 'doctors') return
    const items = sys.org[tab]
    if (items.some((x) => x.id !== it.id && normalizeText(x.name) === normalizeText(it.name))) return toast({ title: `Tên ${meta.noun} đã tồn tại`, tone: 'warning' })
    const next = { ...it, name: it.name.trim(), updatedAt: new Date().toISOString() }
    update((s) => ({ ...s, org: { ...s.org, [tab]: edit?.isNew ? [next, ...items] : items.map((x) => (x.id === it.id ? next : x)) } }))
    toast({ title: edit?.isNew ? `Đã thêm ${meta.noun}` : `Đã cập nhật ${meta.noun}`, tone: 'success' })
    setEdit(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs variant="pill" value={tab} onChange={setTab} items={ORG_TABS.map((t) => ({ value: t.value, label: t.label }))} />
        {tab !== 'doctors' && (
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={openNew}>
            Thêm mới
          </Button>
        )}
      </div>
      {tab === 'doctors' ? (
        <>
          <SimpleTable
            head={['Bác sĩ', 'Kinh nghiệm', 'Chuyên khoa', 'Chuyên khám', 'Phòng mặc định']}
            rows={DOCTORS.map((d) => ({
              key: d.id,
              cells: [
                <span className="flex items-center gap-2 font-medium text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-line bg-brand-tint text-[11px] font-semibold text-brand-ink">{initials(d.name)}</span>
                  {d.title} {d.name}
                </span>,
                '—',
                'Nhi khoa',
                d.specialty,
                roomById(d.defaultRoomId)?.name ?? '—',
              ],
            }))}
          />
          <p className="text-[12px] text-ink-3">Danh sách bác sĩ lấy từ dữ liệu khám (dùng chung với Lễ tân, Khám bệnh).</p>
        </>
      ) : (
        <SimpleTable
          head={[meta.label, 'Mô tả', 'Cập nhật']}
          empty="Không có dữ liệu"
          rows={list.map((x) => ({
            key: x.id,
            cells: [<b className="text-ink">{x.name}</b>, <span className="text-ink-3">{x.description}</span>, <span className="tabular-nums text-ink-3">{x.updatedAt ? formatDateTimeVN(x.updatedAt) : ''}</span>],
            actions: (
              <RowMenu
                items={[
                  { label: 'Điều chỉnh', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEdit({ item: x, isNew: false }) },
                  { label: 'Xoá', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onSelect: () => setDel(x) },
                ]}
              />
            ),
          }))}
        />
      )}
      {edit && <NameDescModal title={`Thông tin ${meta.noun}`} item={edit.item} onClose={() => setEdit(null)} onSave={saveItem} />}
      <ConfirmDiscardModal
        open={!!del}
        title="Bạn có chắc muốn xoá?"
        description={del ? `Xoá ${meta.noun} "${del.name}".` : ''}
        cancelLabel="Huỷ"
        confirmLabel="Xác nhận"
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del && tab !== 'doctors') update((s) => ({ ...s, org: { ...s.org, [tab]: s.org[tab].filter((x) => x.id !== del.id) } }))
          toast({ title: `Đã xoá ${meta.noun}`, tone: 'success' })
          setDel(null)
        }}
      />
    </div>
  )
}

function NameDescModal({ title, item, onClose, onSave }: { title: string; item: OrgItem; onClose: () => void; onSave: (i: OrgItem) => void }) {
  const [it, setIt] = useState(item)
  const [touched, setTouched] = useState(false)
  const submit = () => {
    setTouched(true)
    if (it.name.trim()) onSave(it)
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <Button onClick={submit}>
          Lưu
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Tên hiển thị" required error={touched && !it.name.trim() ? 'Nhập tên hiển thị' : ''}>
          <input autoFocus value={it.name} onChange={(e) => setIt((x) => ({ ...x, name: e.target.value }))} className={input} />
        </Field>
        <Field label="Mô tả">
          <textarea value={it.description} onChange={(e) => setIt((x) => ({ ...x, description: e.target.value }))} rows={3} className={input.replace('h-9', 'h-auto py-2')} />
        </Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tiền công khám (168–170)                                            */
/* ------------------------------------------------------------------ */

export function FeeSection() {
  const { services } = useClinicState()
  const { setServices } = useClinicActions()
  const toast = useToast()
  const list = services ?? SERVICES
  const [edit, setEdit] = useState<{ s: Service & { description?: string }; isNew: boolean } | null>(null)
  const openNew = () => setEdit({ s: { id: newId('s'), name: '', price: 0 }, isNew: true })
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={openNew}>
          Thêm mới
        </Button>
      </div>
      <SimpleTable
        head={['STT', 'Tên hiển thị', 'Mô tả', 'Phí']}
        rows={list.map((s, i) => ({
          key: s.id,
          cells: [<span className="tabular-nums text-ink-3">{i + 1}</span>, <b className="text-ink">{s.name}</b>, <span className="text-ink-3">{(s as Service & { description?: string }).description ?? s.name}</span>, <span className="font-medium text-ink tabular-nums">{formatNumber(s.price)}</span>],
          actions: <RowMenu items={[{ label: 'Điều chỉnh', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEdit({ s, isNew: false }) }]} />,
        }))}
      />
      <p className="text-[12px] text-ink-3">Công khám dùng khi tiếp nhận (Lễ tân) và trong màn Khám bệnh; thay đổi giá áp dụng cho lượt khám mới.</p>
      {edit && (
        <FeeModal
          value={edit.s}
          onClose={() => setEdit(null)}
          onSave={(s) => {
            if (list.some((x) => x.id !== s.id && normalizeText(x.name) === normalizeText(s.name))) return toast({ title: 'Tên công khám đã tồn tại', tone: 'warning' })
            setServices(edit.isNew ? [...list, s] : list.map((x) => (x.id === s.id ? s : x)))
            toast({ title: edit.isNew ? 'Đã thêm công khám' : 'Đã cập nhật công khám', tone: 'success' })
            setEdit(null)
          }}
        />
      )}
    </div>
  )
}

function FeeModal({ value, onClose, onSave }: { value: Service & { description?: string }; onClose: () => void; onSave: (s: Service & { description?: string }) => void }) {
  const [s, setS] = useState(value)
  const [touched, setTouched] = useState(false)
  const submit = () => {
    setTouched(true)
    if (s.name.trim()) onSave({ ...s, name: s.name.trim() })
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Công khám"
      footer={
        <Button onClick={submit}>
          Lưu
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tên hiển thị" required error={touched && !s.name.trim() ? 'Nhập tên hiển thị' : ''}>
          <input autoFocus value={s.name} onChange={(e) => setS((x) => ({ ...x, name: e.target.value }))} className={input} />
        </Field>
        <Field label="Mô tả">
          <input value={s.description ?? ''} onChange={(e) => setS((x) => ({ ...x, description: e.target.value }))} className={input} />
        </Field>
        <Field label="Phí">
          <input value={formatNumber(s.price)} inputMode="numeric" onChange={(e) => setS((x) => ({ ...x, price: Number(e.target.value.replace(/\D/g, '')) || 0 }))} className={cn(input, 'text-right tabular-nums')} />
        </Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Truy cập bệnh án điện tử (171–174)                                  */
/* ------------------------------------------------------------------ */

const ACTION_LABEL = { view: 'XEM', edit: 'CHỈNH SỬA', delete: 'XOÁ' } as const
const STATE_LABEL = { draft: 'Nháp', created: 'Khởi tạo', closed: 'Đã đóng' } as const

export function EmrLogSection() {
  const { emrLogs } = useClinicState()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [action, setAction] = useState<'all' | 'view' | 'edit' | 'delete'>('all')
  const [sign, setSign] = useState<'all' | SignStatus>('all')
  const [state, setState] = useState<'all' | 'draft' | 'created' | 'closed'>('all')
  const [applied, setApplied] = useState({ from, to, action, sign, state })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const rows = useMemo(
    () =>
      (emrLogs ?? []).filter((l) => {
        const day = localDate(l.at)
        if (applied.from && day < applied.from) return false
        if (applied.to && day > applied.to) return false
        if (applied.action !== 'all' && l.action !== applied.action) return false
        if (applied.sign !== 'all' && l.signStatus !== applied.sign) return false
        if (applied.state !== 'all' && l.state !== applied.state) return false
        return true
      }),
    [emrLogs, applied],
  )
  const time = (iso: string) => {
    const d = new Date(iso)
    const hms = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
    return `${hms} ${formatDateVN(localDate(iso))}`
  }
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <DatePicker label="Từ ngày" value={from} max={to || undefined} onChange={setFrom} className="w-[150px]" />
        <DatePicker label="Đến ngày" value={to} min={from || undefined} onChange={setTo} className="w-[150px]" />
        <Select
          label="Hành động"
          value={action}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'edit', label: 'Chỉnh sửa' },
            { value: 'view', label: 'Xem' },
            { value: 'delete', label: 'Xoá' },
          ]}
          onChange={setAction}
          className="w-[140px]"
        />
        <Select label="Ký số" value={sign} options={[{ value: 'all', label: 'Tất cả' }, ...(['signed', 'pending', 'unsigned'] as SignStatus[]).map((s) => ({ value: s, label: SIGN_LABEL[s] }))]} onChange={setSign} className="w-[140px]" />
        <Select
          label="Trạng thái"
          value={state}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'draft', label: 'Nháp' },
            { value: 'created', label: 'Khởi tạo' },
            { value: 'closed', label: 'Đã đóng' },
          ]}
          onChange={setState}
          className="w-[140px]"
        />
        <Button className="w-[74px]" onClick={() => (setApplied({ from, to, action, sign, state }), setPage(1))}>
          Tìm
        </Button>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full text-[13px]">
          <thead className="border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
            <tr>
              <th className="w-28 px-3 py-2.5 text-left font-semibold">Thời gian</th>
              <th className="px-3 py-2.5 text-left font-semibold">Chi tiết</th>
              <th className="w-28 px-3 py-2.5 text-left font-semibold">Ký số</th>
              <th className="w-28 px-3 py-2.5 text-left font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState description="Lịch sử xem / chỉnh sửa bệnh án sẽ hiển thị tại đây." />
                </td>
              </tr>
            )}
            {pageRows.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-brand-wash">
                <td className="px-3 py-2.5 text-ink-2 tabular-nums">{formatDateVN(localDate(l.at))}</td>
                <td className="px-3 py-2.5 text-ink">
                  {l.user} đã <b>{ACTION_LABEL[l.action]}</b> bệnh án <span className="font-medium text-info-ink tabular-nums">{l.emrCode}</span> vào lúc <span className="tabular-nums">{time(l.at)}</span>.
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-2 uppercase">{SIGN_LABEL[l.signStatus]}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase', l.state === 'closed' ? 'bg-subtle text-ink-3' : 'bg-accent-soft text-accent-strong')}>{STATE_LABEL[l.state]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={Math.ceil(rows.length / pageSize)} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Nhân viên (175–176)                                                 */
/* ------------------------------------------------------------------ */

export function StaffSection() {
  const [sys, update] = useSystem()
  const toast = useToast()
  const [edit, setEdit] = useState<StaffMember | 'new' | null>(null)
  const [del, setDel] = useState<StaffMember | null>(null)
  const username = (m: StaffMember) => `${sys.general.accountPrefix}_${normalizeText(m.firstName).replace(/[^a-z0-9]/g, '') || 'nv'}`
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setEdit('new')}>
          Thêm nhân viên
        </Button>
      </div>
      <SimpleTable
        head={['Người dùng', 'Tên đăng nhập', 'Trạng thái']}
        rows={sys.staff.map((m) => ({
          key: m.id,
          cells: [
            <span className="flex items-center gap-2.5">
              {m.avatar ? <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line bg-brand-tint text-[11.5px] font-semibold text-brand-ink">{initials(`${m.lastName} ${m.firstName}`)}</span>}
              <span>
                <b className="text-ink">
                  {m.lastName} {m.firstName}
                </b>
                <span className="block text-xs text-ink-3">
                  {m.email} · {m.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </span>
            </span>,
            <span className="font-mono text-[12.5px] text-ink-2">{username(m)}</span>,
            <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold', m.status === 'active' ? 'bg-brand-soft text-brand-ink' : 'bg-subtle text-ink-3')}>{m.status === 'active' ? 'Hoạt động' : 'Đã khoá'}</span>,
          ],
          actions: (
            <RowMenu
              items={[
                { label: 'Chỉnh sửa', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEdit(m) },
                {
                  label: m.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá',
                  icon: m.status === 'active' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />,
                  onSelect: () => update((s) => ({ ...s, staff: s.staff.map((x) => (x.id === m.id ? { ...x, status: x.status === 'active' ? 'locked' : 'active' } : x)) })),
                },
                { label: 'Xoá', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onSelect: () => setDel(m) },
              ]}
            />
          ),
        }))}
      />
      {edit && (
        <StaffModal
          value={edit === 'new' ? undefined : edit}
          onClose={() => setEdit(null)}
          onSave={(m) => {
            if (sys.staff.some((x) => x.id !== m.id && x.email.toLowerCase() === m.email.toLowerCase())) return toast({ title: 'Email đã được dùng cho nhân viên khác', tone: 'warning' })
            update((s) => ({ ...s, staff: edit === 'new' ? [...s.staff, m] : s.staff.map((x) => (x.id === m.id ? m : x)) }))
            toast({ title: edit === 'new' ? 'Đã thêm nhân viên' : 'Đã cập nhật nhân viên', description: `Tên đăng nhập: ${username(m)}`, tone: 'success' })
            setEdit(null)
          }}
        />
      )}
      <ConfirmDiscardModal
        open={!!del}
        title="Bạn có chắc muốn xoá?"
        description={del ? `Xoá nhân viên ${del.lastName} ${del.firstName}.` : ''}
        cancelLabel="Huỷ"
        confirmLabel="Xác nhận"
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) update((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== del.id) }))
          toast({ title: 'Đã xoá nhân viên', tone: 'success' })
          setDel(null)
        }}
      />
    </div>
  )
}

function StaffModal({ value, onClose, onSave }: { value?: StaffMember; onClose: () => void; onSave: (m: StaffMember) => void }) {
  const [m, setM] = useState<StaffMember>(
    value ?? { id: newId('st'), lastName: '', firstName: '', email: '', phone: '', gender: 'male', dob: '', role: 'member', signProvider: 'Viettel', signUsername: '', status: 'active', createdAt: new Date().toISOString() },
  )
  const [pw, setPw] = useState({ a: '', b: '' })
  const [touched, setTouched] = useState(false)
  const set = (p: Partial<StaffMember>) => setM((x) => ({ ...x, ...p }))
  const err: Record<string, string> = {}
  if (!m.lastName.trim()) err.lastName = 'Nhập họ'
  if (!m.firstName.trim()) err.firstName = 'Nhập tên'
  if (!/^\S+@\S+\.\S+$/.test(m.email)) err.email = 'Email không hợp lệ'
  if (!/^0\d{9}$/.test(m.phone.replace(/\D/g, ''))) err.phone = 'Số điện thoại gồm 10 chữ số'
  if (!value) {
    if (pw.a.length < 8) err.pw = 'Mật khẩu tối thiểu 8 ký tự'
    else if (pw.a !== pw.b) err.pw2 = 'Xác nhận mật khẩu không khớp'
  }
  const submit = () => {
    setTouched(true)
    if (Object.keys(err).length) return
    onSave({ ...m, lastName: m.lastName.trim(), firstName: m.firstName.trim(), phone: m.phone.replace(/\D/g, '') })
  }
  const e = (k: string) => (touched ? err[k] : '')
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Thông tin nhân viên"
      footer={
        <Button onClick={submit}>
          Lưu
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Hình ảnh">
          <ImagePick value={m.avatar} onChange={(avatar) => set({ avatar })} hint=".png, .jpeg dung lượng tối đa 5MB" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Họ" required error={e('lastName')}>
            <input value={m.lastName} onChange={(ev) => set({ lastName: ev.target.value })} className={input} />
          </Field>
          <Field label="Tên" required error={e('firstName')}>
            <input value={m.firstName} onChange={(ev) => set({ firstName: ev.target.value })} className={input} />
          </Field>
          {!value && (
            <>
              <Field label="Mật khẩu" required error={e('pw')} hint="Không lưu mật khẩu trong bản demo.">
                <input type="password" value={pw.a} onChange={(ev) => setPw((x) => ({ ...x, a: ev.target.value }))} autoComplete="new-password" className={input} />
              </Field>
              <Field label="Xác nhận mật khẩu" required error={e('pw2')}>
                <input type="password" value={pw.b} onChange={(ev) => setPw((x) => ({ ...x, b: ev.target.value }))} autoComplete="new-password" className={input} />
              </Field>
            </>
          )}
          <Field label="Email" required error={e('email')}>
            <input value={m.email} onChange={(ev) => set({ email: ev.target.value })} className={input} />
          </Field>
          <Field label="Số điện thoại" required error={e('phone')}>
            <input value={m.phone} onChange={(ev) => set({ phone: ev.target.value })} className={input} />
          </Field>
          <Field label="Giới tính">
            <div className="flex h-9 items-center gap-8 text-[13px] text-ink">
              {(['male', 'female'] as const).map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" checked={m.gender === g} onChange={() => set({ gender: g })} className="accent-brand" />
                  {g === 'male' ? 'Nam' : 'Nữ'}
                </label>
              ))}
            </div>
          </Field>
          <DatePicker label="Ngày sinh" value={m.dob} max={todayISO()} onChange={(dob) => set({ dob })} />
        </div>
        <Field label="Phân quyền" required hint="Chỉ định quyền cho tài khoản">
          <div className="flex gap-6 rounded-[10px] border border-line bg-canvas px-3 py-2 text-[13px] text-ink">
            {(['member', 'admin'] as const).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" checked={m.role === r} onChange={() => set({ role: r })} className="accent-brand" />
                {r === 'member' ? 'Thành viên' : 'Quản trị viên'}
              </label>
            ))}
          </div>
        </Field>
        <SignFields value={m} onChange={(p) => set(p as Partial<StaffMember>)} />
      </div>
    </Modal>
  )
}
