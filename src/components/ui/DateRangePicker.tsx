import { useRef, useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { Popover } from './Popover'
import { DatePicker } from './DatePicker'
import { Button } from './Button'
import { addDays, formatDateVN, parseISODate, toISODate, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'

export interface DateRange {
  from: string
  to: string
  /** Khoá kỳ nhanh đang chọn (để hiển thị nhãn) */
  preset: RangePreset
}

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom'

export const PRESET_LABEL: Record<RangePreset, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  '7d': '7 ngày trước',
  '30d': '30 ngày trước',
  month: 'Tháng này',
  lastMonth: 'Tháng trước',
  quarter: 'Quý này',
  year: 'Năm nay',
  custom: 'Tuỳ chọn',
}

/** Khoảng ngày của kỳ nhanh, tính theo ngày hiện tại */
export function presetRange(p: RangePreset, today = todayISO()): DateRange {
  const d = parseISODate(today)
  const y = d.getFullYear()
  const m = d.getMonth()
  const iso = (yy: number, mm: number, dd: number) => toISODate(new Date(yy, mm, dd))
  switch (p) {
    case 'today':
      return { from: today, to: today, preset: p }
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1), preset: p }
    case '7d':
      return { from: addDays(today, -6), to: today, preset: p }
    case '30d':
      return { from: addDays(today, -29), to: today, preset: p }
    case 'month':
      return { from: iso(y, m, 1), to: today, preset: p }
    case 'lastMonth':
      return { from: iso(y, m - 1, 1), to: iso(y, m, 0), preset: p }
    case 'quarter':
      return { from: iso(y, Math.floor(m / 3) * 3, 1), to: today, preset: p }
    case 'year':
      return { from: iso(y, 0, 1), to: today, preset: p }
    default:
      return { from: today, to: today, preset: 'custom' }
  }
}

export const rangeLabel = (r: DateRange) => (r.preset === 'custom' ? `${formatDateVN(r.from)} – ${formatDateVN(r.to)}` : PRESET_LABEL[r.preset])

/** Chọn kỳ nhanh + tuỳ chọn từ ngày – đến ngày (ảnh 121, 138) */
export function DateRangePicker({
  value,
  onChange,
  presets = ['today', 'yesterday', '7d', '30d', 'month', 'lastMonth', 'quarter', 'year'],
  className,
}: {
  value: DateRange
  onChange: (r: DateRange) => void
  presets?: RangePreset[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          setDraft(value)
          setOpen((o) => !o)
        }}
        className={cn('inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] text-ink hover:bg-subtle', open && 'border-brand ring-2 ring-brand/15', className)}
      >
        <CalendarDays className="h-4 w-4 text-ink-3" />
        <span className="whitespace-nowrap">{rangeLabel(value)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} className="flex w-[480px] max-w-[94vw]">
        <ul className="w-36 shrink-0 border-r border-line py-1.5">
          {[...presets, 'custom' as const].map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => {
                  if (p === 'custom') return setDraft((d) => ({ ...d, preset: 'custom' }))
                  onChange(presetRange(p))
                  setOpen(false)
                }}
                className={cn('w-full px-3 py-1.5 text-left text-[13px] text-ink-2 hover:bg-subtle', draft.preset === p && 'bg-brand-soft font-semibold text-brand-ink')}
              >
                {PRESET_LABEL[p]}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-1 flex-col gap-3 p-3">
          <DatePicker label="Từ ngày" value={draft.from} max={draft.to} onChange={(from) => setDraft((d) => ({ ...d, from, preset: 'custom' }))} />
          <DatePicker label="Đến ngày" value={draft.to} min={draft.from} onChange={(to) => setDraft((d) => ({ ...d, to, preset: 'custom' }))} />
          <p className="text-xs text-ink-4">Kỳ báo cáo: {rangeLabel(draft)}</p>
          <div className="mt-auto flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange({ ...draft, preset: 'custom' })
                setOpen(false)
              }}
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </Popover>
    </>
  )
}
