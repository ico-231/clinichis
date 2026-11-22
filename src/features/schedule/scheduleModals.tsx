import { useState, type ReactNode } from 'react'
import { AlertCircle, CalendarDays, ChevronDown, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Kbd } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DatePicker } from '@/components/ui/DatePicker'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { FixedSlot, FlexSlot, LeaveSlot, ScheduleKind } from '@/store/types'

export const WEEKDAY_LABEL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
export const KIND_LABEL: Record<ScheduleKind, string> = { exam: 'Lịch khám', online: 'Lịch tư vấn trực tuyến' }
export const KIND_COLOR: Record<ScheduleKind, string> = { exam: 'border-blue-500 bg-blue-50 text-blue-800', online: 'border-emerald-500 bg-emerald-50 text-emerald-800' }

export const newSlotId = () => `sl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const input = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600">*</span>}
        {hint && <AlertCircle className="h-3 w-3 text-slate-400" aria-label={hint} />}
      </span>
      {children}
    </label>
  )
}

export function NumberInput({ value, onChange, placeholder, min = 0 }: { value?: number; onChange: (v: number | undefined) => void; placeholder?: string; min?: number }) {
  return (
    <input
      type="number"
      min={min}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(min, Number(e.target.value)))}
      className={input}
    />
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
      {label}
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative h-5 w-9 rounded-full transition', checked ? 'bg-blue-600' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

/** Kiểm tra khung giờ: giờ kết thúc sau giờ bắt đầu, đủ thời lượng 1 slot */
export function validateSlot(s: { start: string; end: string; slotMinutes?: number; perSlot?: number }) {
  if (!s.start || !s.end) return 'Nhập giờ bắt đầu và giờ kết thúc'
  if (s.end <= s.start) return 'Giờ kết thúc phải sau giờ bắt đầu'
  if (s.slotMinutes !== undefined) {
    const [h1, m1] = s.start.split(':').map(Number)
    const [h2, m2] = s.end.split(':').map(Number)
    if (!s.slotMinutes || s.slotMinutes < 5) return 'Thời gian 1 slot tối thiểu 5 phút'
    if (h2 * 60 + m2 - (h1 * 60 + m1) < s.slotMinutes) return 'Khung giờ ngắn hơn thời gian 1 slot'
  }
  if (s.perSlot !== undefined && s.perSlot < 1) return 'Số lượt khám trên một slot tối thiểu là 1'
  return null
}

export const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start < b.end && b.start < a.end

const slotCount = (s: { start: string; end: string; slotMinutes: number; perSlot: number }) => {
  const [h1, m1] = s.start.split(':').map(Number)
  const [h2, m2] = s.end.split(':').map(Number)
  return Math.floor((h2 * 60 + m2 - (h1 * 60 + m1)) / s.slotMinutes) * s.perSlot
}

/* ------------------------------------------------------------------ */
/* Thiết lập lịch cố định theo tuần (ảnh 079)                          */
/* ------------------------------------------------------------------ */

export function WeeklySetupModal({ initial, onClose, onApply }: { initial: FixedSlot[]; onClose: () => void; onApply: (slots: FixedSlot[]) => void }) {
  const [kind, setKind] = useState<ScheduleKind>('exam')
  const [slots, setSlots] = useState<FixedSlot[]>(initial)
  const [advanced, setAdvanced] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const mine = (wd: number) => slots.filter((s) => s.weekday === wd && s.kind === kind)
  const dayOn = (wd: number) => mine(wd).some((s) => s.enabled)

  const patch = (id: string, p: Partial<FixedSlot>) => setSlots((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const addSlot = (wd: number) => {
    const last = mine(wd).at(-1)
    const start = last?.end ?? '08:00'
    const [h, m] = start.split(':').map(Number)
    const end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setSlots((l) => [...l, { id: newSlotId(), weekday: wd, kind, start, end, perSlot: 1, slotMinutes: 30, enabled: true }])
  }
  /** Sao chép khung giờ của một ngày sang các ngày (cùng loại lịch) chưa có khung giờ nào */
  const copyTo = (from: number) =>
    setSlots((l) => {
      const src = l.filter((s) => s.weekday === from && s.kind === kind)
      const targets = [0, 1, 2, 3, 4, 5, 6].filter((wd) => wd !== from && !l.some((s) => s.weekday === wd && s.kind === kind))
      return [...l, ...targets.flatMap((wd) => src.map((s) => ({ ...s, id: newSlotId(), weekday: wd })))]
    })

  const apply = () => {
    for (const wd of [0, 1, 2, 3, 4, 5, 6]) {
      const list = mine(wd).filter((s) => s.enabled)
      for (const s of list) {
        const e = validateSlot(s)
        if (e) return setError(`${WEEKDAY_LABEL[wd]} ${s.start}–${s.end}: ${e}`)
      }
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) if (overlaps(list[i], list[j])) return setError(`${WEEKDAY_LABEL[wd]}: khung ${list[i].start}–${list[i].end} trùng với ${list[j].start}–${list[j].end}`)
    }
    onApply(slots)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Thiết lập khung thời gian để khách hàng đặt lịch khám"
      description="Khung thời gian được lặp lại cố định theo các thứ trong tuần."
      footer={
        <>
          {error && <span className="mr-auto text-[12.5px] text-red-600">{error}</span>}
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={apply} rightIcon={<Kbd tone="blue">F2</Kbd>}>
            Áp dụng
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[13px] font-medium">Loại lịch làm việc:</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)} className={cn(input, 'w-[230px]')}>
          <option value="exam">Lịch khám</option>
          <option value="online">Lịch tư vấn trực tuyến</option>
        </select>
      </div>
      <div className="space-y-2">
        {WEEKDAY_LABEL.map((label, wd) => {
          const list = mine(wd)
          const on = list.length > 0 && dayOn(wd)
          return (
            <div key={wd} className={cn('rounded-lg border px-3 py-2.5', on ? 'border-slate-300' : 'border-slate-200')}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Bật lịch ${label}`}
                  onClick={() => (list.length ? setSlots((l) => l.map((s) => (s.weekday === wd && s.kind === kind ? { ...s, enabled: !on } : s))) : addSlot(wd))}
                  className={cn('relative h-5 w-9 shrink-0 rounded-full transition', on ? 'bg-blue-600' : 'bg-slate-300')}
                >
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
                </button>
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold">{label}</p>
                  {list.length > 0 && (
                    <p className="text-[11.5px] text-slate-500">
                      {list.length} khung giờ · {formatNumber(list.filter((s) => s.enabled).reduce((n, s) => n + slotCount(s), 0))} lượt
                    </p>
                  )}
                </div>
                {on && (
                  <>
                    <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => addSlot(wd)}>
                      Thêm khung giờ
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copyTo(wd)} title="Sao chép sang các ngày chưa có lịch">
                      Sao chép
                    </Button>
                  </>
                )}
              </div>
              {on &&
                list.map((s) => (
                  <div key={s.id} className="mt-2 rounded-md bg-slate-50 p-2.5">
                    <div className="mb-1.5 flex items-center gap-2 text-[11.5px] text-slate-500">
                      <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200">{s.enabled ? 'Đang bật' : 'Nháp'}</span>
                      <span>{s.slotMinutes} phút/slot</span>
                      <span>{formatNumber(slotCount(s))} lượt</span>
                      <button type="button" onClick={() => setSlots((l) => l.filter((x) => x.id !== s.id))} className="ml-auto rounded p-1 text-red-600 hover:bg-red-50" aria-label="Xoá khung giờ">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <Field label="Giờ bắt đầu" required>
                        <input type="time" value={s.start} onChange={(e) => patch(s.id, { start: e.target.value })} className={input} />
                      </Field>
                      <Field label="Giờ kết thúc" required>
                        <input type="time" value={s.end} onChange={(e) => patch(s.id, { end: e.target.value })} className={input} />
                      </Field>
                      <Field label="Số lượt khám trên một slot" required>
                        <NumberInput min={1} value={s.perSlot} onChange={(v) => patch(s.id, { perSlot: v ?? 1 })} />
                      </Field>
                      <Field label="Thời gian 1 slot (phút)" required>
                        <NumberInput min={5} value={s.slotMinutes} onChange={(v) => patch(s.id, { slotMinutes: v ?? 30 })} />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAdvanced((a) => {
                          const n = new Set(a)
                          if (n.has(s.id)) n.delete(s.id)
                          else n.add(s.id)
                          return n
                        })
                      }
                      className="mt-2 flex w-full items-center justify-between text-[12.5px] text-slate-600"
                    >
                      Cài đặt nâng cao <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advanced.has(s.id) && 'rotate-180')} />
                    </button>
                    {advanced.has(s.id) && <AdvancedFields slot={s} onChange={(p) => patch(s.id, p)} />}
                  </div>
                ))}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function AdvancedFields({ slot, onChange }: { slot: Pick<FixedSlot, 'minDaysAhead' | 'maxDaysAhead' | 'fee' | 'discount'>; onChange: (p: Partial<FixedSlot>) => void }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
      <Field label="Số ngày phải đặt khám trước" hint="Người bệnh phải đặt trước ít nhất số ngày này">
        <NumberInput value={slot.minDaysAhead} onChange={(v) => onChange({ minDaysAhead: v })} placeholder="Ngày" />
      </Field>
      <Field label="Số ngày đặt khám xa nhất" hint="Cho phép đặt lịch tối đa trước bao nhiêu ngày">
        <NumberInput value={slot.maxDaysAhead} onChange={(v) => onChange({ maxDaysAhead: v })} placeholder="Ngày" />
      </Field>
      <Field label="Phí khám" hint="Để trống nếu dùng phí công khám mặc định">
        <NumberInput value={slot.fee} onChange={(v) => onChange({ fee: v })} placeholder="Phí khám" />
      </Field>
      <Field label="Giảm giá (%)">
        <NumberInput value={slot.discount} onChange={(v) => onChange({ discount: v === undefined ? undefined : Math.min(100, v) })} placeholder="% Giảm giá" />
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Điều chỉnh 1 khung giờ cố định / linh hoạt (ảnh 081, 085, 086)      */
/* ------------------------------------------------------------------ */

type EditableSlot = (FixedSlot | FlexSlot) & { weekday?: number; date?: string }

export function SlotEditModal({
  title,
  slot,
  others,
  onClose,
  onSave,
  onDelete,
}: {
  title: string
  slot: EditableSlot
  /** Khung giờ khác cùng ngày để kiểm tra trùng */
  others: { start: string; end: string; id: string }[]
  onClose: () => void
  onSave: (s: EditableSlot) => void
  onDelete?: () => void
}) {
  const [s, setS] = useState<EditableSlot>(slot)
  const [error, setError] = useState<string | null>(null)
  const set = (p: Partial<EditableSlot>) => setS((x) => ({ ...x, ...p }) as EditableSlot)
  const isFlex = s.date !== undefined
  const save = () => {
    const e = validateSlot(s)
    if (e) return setError(e)
    if (s.enabled && others.some((o) => o.id !== s.id && overlaps(o, s))) return setError('Khung giờ bị trùng với lịch khác trong cùng ngày')
    onSave(s)
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <div className="flex w-full items-center gap-2">
          <Toggle label="Bật/Tắt lịch" checked={s.enabled} onChange={(enabled) => set({ enabled })} />
          {error && <span className="ml-2 text-[12px] text-red-600">{error}</span>}
          <span className="ml-auto" />
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Xoá lịch
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button size="sm" onClick={save}>
            {onDelete ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </div>
      }
    >
      {isFlex && (
        <p className="mb-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
          Lịch khám này chỉ áp dụng cho ngày bạn đã chọn, không lặp lại và không áp dụng cho các ngày khác. Lịch hẹn đã đặt trùng giờ với lịch mới cần được kiểm tra và thông báo lại cho người bệnh.
        </p>
      )}
      <div className="space-y-3">
        {isFlex ? (
          <DatePicker label="Ngày khám" required value={s.date!} onChange={(date) => set({ date })} />
        ) : (
          <Field label="Thứ trong tuần" required>
            <select value={s.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} className={input}>
              {WEEKDAY_LABEL.map((l, i) => (
                <option key={l} value={i}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Loại lịch làm việc" required>
          <select value={s.kind} onChange={(e) => set({ kind: e.target.value as ScheduleKind })} className={input}>
            <option value="exam">Lịch khám</option>
            <option value="online">Lịch tư vấn trực tuyến</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Giờ bắt đầu" required>
            <input type="time" value={s.start} onChange={(e) => set({ start: e.target.value })} className={input} />
          </Field>
          <Field label="Giờ kết thúc" required>
            <input type="time" value={s.end} onChange={(e) => set({ end: e.target.value })} className={input} />
          </Field>
          <Field label="Số lượt khám trên một slot" required>
            <NumberInput min={1} value={s.perSlot} onChange={(v) => set({ perSlot: v ?? 1 })} />
          </Field>
          <Field label="Thời gian 1 slot (phút)" required>
            <NumberInput min={5} value={s.slotMinutes} onChange={(v) => set({ slotMinutes: v ?? 30 })} placeholder="Phút" />
          </Field>
        </div>
        <AdvancedFields slot={s} onChange={(p) => set(p)} />
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Lịch nghỉ (ảnh 082, 084)                                            */
/* ------------------------------------------------------------------ */

export function LeaveModal({ leave, onClose, onSave, onDelete }: { leave: LeaveSlot; onClose: () => void; onSave: (l: LeaveSlot) => void; onDelete?: () => void }) {
  const [l, setL] = useState(leave)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={onDelete ? 'Điều chỉnh lịch nghỉ' : 'Thêm lịch nghỉ'}
      footer={
        <div className="flex w-full items-center gap-2">
          {onDelete && <Toggle label="Bật/Tắt lịch" checked={l.enabled} onChange={(enabled) => setL((x) => ({ ...x, enabled }))} />}
          {error && <span className="ml-2 text-[12px] text-red-600">{error}</span>}
          <span className="ml-auto" />
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Xoá lịch
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const e = validateSlot(l)
              if (e) return setError(e)
              onSave(l)
            }}
          >
            {onDelete ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </div>
      }
    >
      <p className="mb-3 flex gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
        <span>
          <b>Lưu ý</b>
          <br />
          Khách hàng sẽ không thể đặt lịch khám hoặc tư vấn vào khung giờ nghỉ. Các lịch đã được người bệnh đặt trước đó cũng sẽ bị huỷ.
        </span>
      </p>
      <div className="space-y-3">
        <DatePicker label="Ngày nghỉ" required value={l.date} onChange={(date) => setL((x) => ({ ...x, date }))} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Giờ bắt đầu" required>
            <input type="time" value={l.start} onChange={(e) => setL((x) => ({ ...x, start: e.target.value }))} className={input} />
          </Field>
          <Field label="Giờ kết thúc" required>
            <input type="time" value={l.end} onChange={(e) => setL((x) => ({ ...x, end: e.target.value }))} className={input} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

export function SlotChip({ kind, label, time, onClick, tone }: { kind?: ScheduleKind; label: string; time: string; onClick: () => void; tone?: 'leave' }) {
  return (
    <button
      title={`${label} · ${time}`}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'group flex w-full items-start gap-1 rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11.5px] leading-4',
        tone === 'leave' ? 'border-red-500 bg-red-50 text-red-800' : KIND_COLOR[kind ?? 'exam'],
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        <span className="block">{time}</span>
      </span>
      <Pencil className="mt-0.5 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-70" />
    </button>
  )
}
