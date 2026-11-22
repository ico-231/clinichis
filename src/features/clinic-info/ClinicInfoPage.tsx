import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BadgeCheck, ImagePlus, MapPin, Plus, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Kbd } from '@/components/ui/Button'
import { RichTextArea, RichView } from '@/components/ui/RichText'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { PROVINCES } from '@/store/administrativeCatalog'
import { CLINIC, DOCTORS } from '@/store/catalog'
import { compressImage } from '@/lib/files'
import { formatNumber, initials } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PendingProfileBanner } from '../schedule/SchedulePage'
import type { ClinicProfile } from '@/store/types'

export function defaultProfile(): ClinicProfile {
  const d = DOCTORS[0]
  return {
    clinicName: CLINIC.name,
    phone: CLINIC.hotline.replace(/\s/g, ''),
    email: '',
    doctorName: d.name,
    practiceSince: '2010',
    specialty: 'Nhi khoa',
    examSpecialty: d.specialty,
    workplace: CLINIC.name,
    position: '',
    degree: d.title,
    province: 'TP. Hồ Chí Minh',
    ward: '',
    address: CLINIC.address,
    qualifications: [],
    prices: [{ name: 'Khám nhi tổng quát', price: 150_000 }],
    workingHours: [{ days: 'Thứ 2 - Thứ 7', hours: '07:30 - 17:00' }],
    training: [],
    introduction: '',
    experience: '',
    awards: '',
    images: [],
    status: 'draft',
  }
}

const input = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
const DEGREES = ['Bác sĩ', 'Bác sĩ chuyên khoa I', 'Bác sĩ chuyên khoa II', 'Thạc sĩ', 'Tiến sĩ', 'Phó giáo sư', 'Giáo sư']
const SPECIALTIES = ['Nhi khoa', 'Nội khoa', 'Tai mũi họng', 'Da liễu', 'Dinh dưỡng', 'Hô hấp']

/** Thông tin phòng khám – hồ sơ bác sĩ công khai (ảnh 087–088) */
export function ClinicInfoPage() {
  const { clinicProfile } = useClinicState()
  const { setClinicProfile } = useClinicActions()
  const toast = useToast()
  const [p, setP] = useState<ClinicProfile>(() => clinicProfile ?? defaultProfile())
  const set = (patch: Partial<ClinicProfile>) => setP((x) => ({ ...x, ...patch }))
  const wards = PROVINCES.find((x) => x.name === p.province)?.wards ?? []
  const years = Math.max(0, new Date().getFullYear() - Number(p.practiceSince || new Date().getFullYear()))

  const publish = () => {
    if (!p.doctorName.trim() || !p.practiceSince || !p.specialty || !p.certificate) {
      toast({ title: 'Thiếu thông tin bắt buộc', description: 'Cần họ tên bác sĩ, năm hành nghề, chuyên khoa và chứng chỉ hành nghề', tone: 'warning' })
      return
    }
    const next: ClinicProfile = { ...p, status: 'pending', submittedAt: new Date().toISOString() }
    setP(next)
    setClinicProfile(next)
    toast({ title: 'Đã gửi thông tin chờ phê duyệt', tone: 'success' })
  }

  // Tự lưu bản nháp (không đổi trạng thái duyệt) để chuyển trang không mất dữ liệu
  useEffect(() => {
    const t = setTimeout(() => setClinicProfile(p), 400)
    return () => clearTimeout(t)
  }, [p, setClinicProfile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault()
        publish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Thông tin phòng khám"
        actions={
          <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-medium', p.status === 'pending' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'bg-slate-100 text-slate-600')}>
            {p.status === 'pending' ? '◌ Chờ phê duyệt' : 'Bản nháp'}
          </span>
        }
      />
      <PendingProfileBanner />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[min(560px,55%)] shrink-0 flex-col border-r border-slate-200">
          <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-3 text-[13px]">
            <Field label="Ảnh đại diện">
              <ImagePick value={p.avatar} onChange={(avatar) => set({ avatar })} hint="Hỗ trợ định dạng PNG, JPEG dung lượng không quá 5MB" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Họ và tên bác sĩ" required>
                <input value={p.doctorName} onChange={(e) => set({ doctorName: e.target.value })} className={input} />
              </Field>
              <Field label="Năm bắt đầu hành nghề" required>
                <input value={p.practiceSince} inputMode="numeric" onChange={(e) => set({ practiceSince: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={input} />
              </Field>
              <Field label="Chuyên khoa" required>
                <select value={p.specialty} onChange={(e) => set({ specialty: e.target.value })} className={input}>
                  {SPECIALTIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Chuyên khám">
                <input value={p.examSpecialty} onChange={(e) => set({ examSpecialty: e.target.value })} placeholder="Chọn chuyên khám" className={input} />
              </Field>
              <Field label="Nơi công tác">
                <input value={p.workplace} onChange={(e) => set({ workplace: e.target.value })} placeholder="Chọn nơi công tác" className={input} />
              </Field>
              <Field label="Chức vụ">
                <input value={p.position} onChange={(e) => set({ position: e.target.value })} placeholder="Giám đốc, Phó Giám đốc" className={input} />
              </Field>
              <Field label="Học hàm / học vị">
                <select value={p.degree} onChange={(e) => set({ degree: e.target.value })} className={input}>
                  {[p.degree, ...DEGREES.filter((d) => d !== p.degree)].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tỉnh/Thành phố">
                <select value={p.province} onChange={(e) => set({ province: e.target.value, ward: '' })} className={input}>
                  {PROVINCES.map((x) => (
                    <option key={x.name}>{x.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phường/Xã">
                <select value={p.ward} onChange={(e) => set({ ward: e.target.value })} className={input}>
                  <option value="">Chọn phường/xã</option>
                  {wards.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </Field>
              <Field label="Địa chỉ">
                <input value={p.address} onChange={(e) => set({ address: e.target.value })} placeholder="Nhập địa chỉ" className={input} />
              </Field>
            </div>
            <ListEditor
              label="Mô tả trình độ chuyên môn"
              items={p.qualifications.map((q) => [q])}
              cols={['Mô tả trình độ chuyên môn']}
              onChange={(rows) => set({ qualifications: rows.map((r) => r[0]) })}
            />
            <ListEditor
              label="Bảng giá dịch vụ"
              items={p.prices.map((x) => [x.name, String(x.price)])}
              cols={['Tên dịch vụ', 'Giá']}
              numericCol={1}
              onChange={(rows) => set({ prices: rows.map((r) => ({ name: r[0], price: Number(r[1]) || 0 })) })}
            />
            <ListEditor
              label="Thời gian làm việc"
              items={p.workingHours.map((x) => [x.days, x.hours])}
              cols={['Thứ 2 - Thứ 6', '08:00 - 17:00']}
              onChange={(rows) => set({ workingHours: rows.map((r) => ({ days: r[0], hours: r[1] })) })}
            />
            <ListEditor label="Đơn vị đào tạo" items={p.training.map((x) => [x.url, x.name])} cols={['URL', 'Tên đơn vị']} onChange={(rows) => set({ training: rows.map((r) => ({ url: r[0], name: r[1] })) })} />
            <RichTextArea label="Giới thiệu" value={p.introduction} onChange={(introduction) => set({ introduction })} placeholder="Giới thiệu về bác sĩ, phòng khám..." />
            <RichTextArea label="Kinh nghiệm làm việc" value={p.experience} onChange={(experience) => set({ experience })} />
            <RichTextArea label="Giải thưởng / Công trình nghiên cứu" value={p.awards} onChange={(awards) => set({ awards })} />
            <Field label="Chứng chỉ hành nghề" required>
              <ImagePick value={p.certificate} onChange={(certificate) => set({ certificate })} hint="PNG, JPEG không quá 5MB" wide />
            </Field>
            <Field label="Hình ảnh">
              <p className="mb-1 text-xs text-slate-500">Chọn tối đa 5 ảnh, định dạng png, jpg.</p>
              <div className="flex flex-wrap gap-2">
                {p.images.map((img, i) => (
                  <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-md border border-slate-200">
                    <img src={img} alt={`Hình ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => set({ images: p.images.filter((_, k) => k !== i) })} className="absolute top-1 right-1 rounded bg-white/90 p-0.5 text-red-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Xoá ảnh">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {p.images.length < 5 && <ImagePick value={undefined} onChange={(img) => img && set({ images: [...p.images, img] })} tile />}
              </div>
            </Field>
          </div>
          <div className="border-t border-slate-200 px-3 py-2.5">
            <Button onClick={publish} rightIcon={<Kbd tone="blue">F10</Kbd>}>
              Đăng thông tin
            </Button>
          </div>
        </div>

        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          <p className="mb-3 text-center text-[12.5px] text-slate-600">Thông tin phòng khám, lịch khám sẽ được hiển thị trên trang đặt lịch để người bệnh có thể tìm kiếm và đặt lịch khám.</p>
          <div className="mx-auto max-w-[620px] space-y-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex gap-4">
              {p.avatar ? (
                <img src={p.avatar} alt="Ảnh đại diện" className="h-28 w-28 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">{initials(p.doctorName || 'BS')}</span>
              )}
              <div className="min-w-0">
                <p className="text-[18px] font-semibold text-slate-900">
                  {p.degree} {p.doctorName}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1 font-medium text-blue-600">
                    <BadgeCheck className="h-4 w-4" /> Bác sĩ
                  </span>
                  <b>{years} năm kinh nghiệm</b>
                </p>
                <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-[12.5px]">
                  <dt className="text-slate-500">Chuyên khoa</dt>
                  <dd className="font-semibold">{p.specialty}</dd>
                  <dt className="text-slate-500">Chức vụ</dt>
                  <dd>{p.position}</dd>
                  <dt className="text-slate-500">Nơi công tác</dt>
                  <dd>{p.workplace}</dd>
                </dl>
              </div>
            </div>
            <Preview title="Giới thiệu">{p.introduction ? <RichView html={p.introduction} className="text-[13px]" /> : <p className="text-[13px] text-slate-500">Bác sĩ</p>}</Preview>
            {p.prices.length > 0 && (
              <Preview title="Bảng giá">
                <ul className="text-[13px]">
                  {p.prices.map((x, i) => (
                    <li key={i} className="flex justify-between border-b border-dashed border-slate-200 py-1">
                      <span>{x.name}</span>
                      <b>{formatNumber(x.price)}đ</b>
                    </li>
                  ))}
                </ul>
              </Preview>
            )}
            {p.workingHours.length > 0 && (
              <Preview title="Thời gian làm việc">
                {p.workingHours.map((w, i) => (
                  <p key={i} className="text-[13px]">
                    {w.days}: <b>{w.hours}</b>
                  </p>
                ))}
              </Preview>
            )}
            <div className="w-[220px] rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white">
              <p className="font-semibold">Địa chỉ</p>
              <p className="mt-1 text-[12.5px] opacity-90">{[p.address, p.ward, p.province].filter(Boolean).join(', ')}</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent([p.address, p.ward, p.province].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-blue-700"
              >
                <MapPin className="h-3.5 w-3.5" /> Mở bản đồ
              </a>
            </div>
            {p.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.images.map((img, i) => (
                  <img key={i} src={img} alt={`Hình phòng khám ${i + 1}`} className="h-24 w-32 rounded-md object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[12.5px] font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </div>
  )
}

function Preview({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1 text-[14px] font-semibold text-slate-900">{title}</p>
      {children}
    </section>
  )
}

export function ImagePick({ value, onChange, hint, wide, tile }: { value?: string; onChange: (v: string | undefined) => void; hint?: string; wide?: boolean; tile?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const pick = (
    <input
      ref={ref}
      type="file"
      accept="image/png,image/jpeg"
      hidden
      onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (f.size > 5 * 1024 * 1024) return toast({ title: 'Ảnh vượt quá 5MB', tone: 'warning' })
        onChange(await compressImage(f, 600, 0.8))
      }}
    />
  )
  if (tile)
    return (
      <>
        <button type="button" onClick={() => ref.current?.click()} className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50" aria-label="Thêm ảnh">
          <ImagePlus className="h-5 w-5" />
        </button>
        {pick}
      </>
    )
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400', wide ? 'h-20 w-28' : 'h-16 w-16')}>
        {value ? <img src={value} alt="Ảnh đã chọn" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
      </div>
      <div>
        <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => ref.current?.click()}>
          Tải lên
        </Button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="ml-2 text-[12px] text-red-600 hover:underline">
            Xoá
          </button>
        )}
        {hint && <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>}
      </div>
      {pick}
    </div>
  )
}

/** Danh sách nhiều dòng có nút "Thêm" và xoá (bảng giá, giờ làm việc...) */
function ListEditor({ label, items, cols, onChange, numericCol }: { label: string; items: string[][]; cols: string[]; onChange: (rows: string[][]) => void; numericCol?: number }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {items.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {cols.map((c, k) => (
              <input
                key={k}
                value={row[k] ?? ''}
                placeholder={c}
                inputMode={k === numericCol ? 'numeric' : undefined}
                onChange={(e) => onChange(items.map((r, j) => (j === i ? r.map((v, kk) => (kk === k ? (k === numericCol ? e.target.value.replace(/\D/g, '') : e.target.value) : v)) : r)))}
                className={cn(input.replace('w-full', ''), k === numericCol ? 'w-[120px] shrink-0 text-right' : 'min-w-0 flex-1')}
              />
            ))}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="shrink-0 rounded-md border border-slate-200 px-2 text-red-500 hover:bg-red-50" aria-label="Xoá dòng">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange([...items, cols.map(() => '')])}>
          Thêm
        </Button>
      </div>
    </Field>
  )
}
