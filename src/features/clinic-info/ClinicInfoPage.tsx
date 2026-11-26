import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BadgeCheck, ImagePlus, MapPin, Plus, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
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
import { useControlLabel } from '@/lib/useControlLabel'

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

const input = 'h-9 w-full rounded-[10px] border border-line-strong bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15'
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

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader
        title="Thông tin phòng khám"
        actions={
          <span className={cn('rounded-full px-3 py-1 text-[12px] font-semibold', p.status === 'pending' ? 'border border-accent-line bg-accent-tint text-accent-strong' : 'bg-subtle text-ink-3')}>
            {p.status === 'pending' ? '◌ Chờ phê duyệt' : 'Bản nháp'}
          </span>
        }
      />
      <PendingProfileBanner />
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-4 overflow-hidden px-4 sm:px-6 pt-1 pb-4">
        <div className="flex w-[min(560px,52%)] shrink-0 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[13px]">
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
              <p className="mb-1 text-xs text-ink-3">Chọn tối đa 5 ảnh, định dạng png, jpg.</p>
              <div className="flex flex-wrap gap-2">
                {p.images.map((img, i) => (
                  <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-[10px] border border-line">
                    <img src={img} alt={`Hình ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => set({ images: p.images.filter((_, k) => k !== i) })} className="absolute top-1 right-1 rounded bg-surface/95 p-0.5 text-accent-ink opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Xoá ảnh">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {p.images.length < 5 && <ImagePick value={undefined} onChange={(img) => img && set({ images: [...p.images, img] })} tile />}
              </div>
            </Field>
          </div>
          <div className="border-t border-line bg-canvas/70 px-4 py-2.5">
            <Button onClick={publish}>
              Đăng thông tin
            </Button>
          </div>
        </div>

        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto rounded-[16px] border border-line bg-subtle p-5">
          <p className="mb-3 text-center text-[12.5px] text-ink-3">Thông tin phòng khám, lịch khám sẽ được hiển thị trên trang đặt lịch để người bệnh có thể tìm kiếm và đặt lịch khám.</p>
          <div className="mx-auto max-w-[620px] space-y-4 rounded-[16px] border border-line bg-surface p-5 shadow-xs">
            <div className="flex gap-4">
              {p.avatar ? (
                <img src={p.avatar} alt="Ảnh đại diện" className="h-28 w-28 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-brand-line bg-brand-tint text-2xl font-bold text-brand-ink">{initials(p.doctorName || 'BS')}</span>
              )}
              <div className="min-w-0">
                <p className="text-[18px] font-bold text-ink">
                  {p.degree} {p.doctorName}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1 font-semibold text-brand-ink">
                    <BadgeCheck className="h-4 w-4" /> Bác sĩ
                  </span>
                  <b className="text-ink tabular-nums">{years} năm kinh nghiệm</b>
                </p>
                <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-[12.5px]">
                  <dt className="text-ink-3">Chuyên khoa</dt>
                  <dd className="font-semibold text-ink">{p.specialty}</dd>
                  <dt className="text-ink-3">Chức vụ</dt>
                  <dd className="text-ink-2">{p.position}</dd>
                  <dt className="text-ink-3">Nơi công tác</dt>
                  <dd className="text-ink-2">{p.workplace}</dd>
                </dl>
              </div>
            </div>
            <Preview title="Giới thiệu">{p.introduction ? <RichView html={p.introduction} className="text-[13px]" /> : <p className="text-[13px] text-ink-3">Bác sĩ</p>}</Preview>
            {p.prices.length > 0 && (
              <Preview title="Bảng giá">
                <ul className="text-[13px]">
                  {p.prices.map((x, i) => (
                    <li key={i} className="flex justify-between border-b border-dashed border-line py-1.5">
                      <span className="text-ink-2">{x.name}</span>
                      <b className="text-ink tabular-nums">{formatNumber(x.price)}đ</b>
                    </li>
                  ))}
                </ul>
              </Preview>
            )}
            {p.workingHours.length > 0 && (
              <Preview title="Thời gian làm việc">
                {p.workingHours.map((w, i) => (
                  <p key={i} className="text-[13px] text-ink-2">
                    {w.days}: <b className="text-ink tabular-nums">{w.hours}</b>
                  </p>
                ))}
              </Preview>
            )}
            <div className="w-[240px] rounded-[14px] bg-brand p-4 text-white">
              <p className="font-semibold">Địa chỉ</p>
              <p className="mt-1 text-[12.5px] opacity-90">{[p.address, p.ward, p.province].filter(Boolean).join(', ')}</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent([p.address, p.ward, p.province].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-brand-ink"
              >
                <MapPin className="h-3.5 w-3.5" /> Mở bản đồ
              </a>
            </div>
            {p.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.images.map((img, i) => (
                  <img key={i} src={img} alt={`Hình phòng khám ${i + 1}`} className="h-24 w-32 rounded-[10px] object-cover" />
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
  const { ref, labelId } = useControlLabel<HTMLSpanElement>()
  return (
    <div>
      <span ref={ref} id={labelId} className="mb-1 block text-[12.5px] font-medium text-ink-2">
        {label}
        {required && <span className="text-accent-ink">*</span>}
      </span>
      {children}
    </div>
  )
}

function Preview({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1 text-[14px] font-bold text-ink">{title}</p>
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
        <button type="button" onClick={() => ref.current?.click()} className="flex h-20 w-20 items-center justify-center rounded-[12px] border border-dashed border-line-strong bg-canvas text-ink-4 hover:bg-subtle" aria-label="Thêm ảnh">
          <ImagePlus className="h-5 w-5" />
        </button>
        {pick}
      </>
    )
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-canvas text-ink-4', wide ? 'h-20 w-28' : 'h-16 w-16')}>
        {value ? <img src={value} alt="Ảnh đã chọn" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
      </div>
      <div>
        <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => ref.current?.click()}>
          Tải lên
        </Button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="ml-2 text-[12px] font-medium text-accent-ink hover:underline">
            Xoá
          </button>
        )}
        {hint && <p className="mt-1 text-[11.5px] text-ink-3">{hint}</p>}
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
                className={cn(input.replace('w-full', ''), k === numericCol ? 'w-[120px] shrink-0 text-right tabular-nums' : 'min-w-0 flex-1')}
              />
            ))}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="shrink-0 rounded-[10px] border border-line px-2 text-accent-ink hover:bg-accent-soft" aria-label="Xoá dòng">
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
