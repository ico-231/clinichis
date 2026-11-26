import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { formatNumber, normalizeText } from '@/lib/format'
import { parseISODate, toISODate, todayISO, WEEKDAYS_VN } from '@/lib/date'
import { useControlLabel } from '@/lib/useControlLabel'

export function CardSectionHeader({
  title,
  accent = 'blue',
  rightSlot,
}: {
  title: string
  accent?: 'blue' | 'orange'
  rightSlot?: ReactNode
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'h-3.5 w-[3px] rounded-full',
            accent === 'blue' ? 'bg-brand' : 'bg-accent',
          )}
        />
        <h2 className="text-[12.5px] font-bold tracking-wide text-ink uppercase">{title}</h2>
      </div>
      {rightSlot}
    </div>
  )
}

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { ref, labelId } = useControlLabel<HTMLLabelElement>()
  return (
    <label ref={ref} id={labelId} className="block text-[12.5px] font-semibold text-ink">
      {label}
      {required && <span className="ml-0.5 text-danger-ink">*</span>}
    </label>
  )
}

export const underlineBase =
  'h-9 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] text-ink outline-none transition placeholder:text-ink-5 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 disabled:bg-subtle disabled:text-ink-4'

interface UnderlineInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  helper?: string
  error?: string
  rightSlot?: ReactNode
  wrapperClassName?: string
}

export function UnderlineInput({
  label,
  required,
  helper,
  error,
  rightSlot,
  wrapperClassName,
  className,
  ...props
}: UnderlineInputProps) {
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} required={required} />
      <div className="relative mt-0.5 flex items-center">
        <input
          {...props}
          className={cn(
            underlineBase,
            Boolean(rightSlot) && 'pr-8',
            error && 'border-danger focus:border-danger',
            className,
          )}
        />
        {rightSlot && <div className="absolute right-2 flex items-center">{rightSlot}</div>}
      </div>
      {error ? (
        <p className="mt-1 text-[11px] text-danger-ink">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[11px] text-ink-4">{helper}</p>
      ) : null}
    </div>
  )
}

export function UnderlineRadioGender({
  label = 'Giới tính',
  value,
  onChange,
  className,
}: {
  label?: string
  value: 'male' | 'female'
  onChange: (gender: 'male' | 'female') => void
  className?: string
}) {
  const items: { v: 'male' | 'female'; text: string }[] = [
    { v: 'male', text: 'Nam' },
    { v: 'female', text: 'Nữ' },
  ]
  return (
    <div className={className}>
      <FieldLabel label={label} />
      <div className="mt-0.5 flex h-8 items-center gap-5">
        {items.map((it) => {
          const checked = value === it.v
          return (
            <button
              key={it.v}
              type="button"
              onClick={() => onChange(it.v)}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink select-none"
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border transition',
                  checked ? 'border-brand' : 'border-line-strong',
                )}
              >
                {checked && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
              {it.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface UnderlineOption<T extends string = string> {
  value: T
  label: string
}

export function UnderlineSelect<T extends string>({
  label,
  required,
  value,
  options,
  onChange,
  placeholder = 'Chọn...',
  searchable,
  iconType = 'chevron',
  error,
  disabled,
  className,
}: {
  label: string
  required?: boolean
  value: T
  options: UnderlineOption<T>[]
  onChange: (val: T) => void
  placeholder?: string
  searchable?: boolean
  iconType?: 'chevron' | 'updown'
  error?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = normalizeText(query)
    return options.filter((o) => normalizeText(o.label).includes(q))
  }, [options, searchable, query])

  const Icon = iconType === 'updown' ? ChevronsUpDown : ChevronDown

  const pick = (val: T) => {
    onChange(val)
    setOpen(false)
    triggerRef.current?.focus()
  }

  /** ↑/↓ chọn dòng, Enter xác nhận – gõ tìm rồi Enter là chọn ngay kết quả đầu */
  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(0, Math.min(filtered.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)))
      setActive(next)
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[active]
      if (opt) pick(opt.value)
    }
  }

  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setQuery('')
          setActive(Math.max(0, options.findIndex((o) => o.value === value)))
          setOpen((o) => !o)
        }}
        className={cn(
          underlineBase,
          'mt-0.5 flex items-center justify-between gap-1 text-left',
          open && 'border-brand',
          error && 'border-danger',
        )}
      >
        <span className={cn('truncate', !selected && 'text-ink-5')}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-ink-5" />
      </button>
      {error && <p className="mt-1 text-[11px] text-danger-ink">{error}</p>}

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        matchWidth
        className="min-w-[200px] overflow-hidden py-1"
      >
        {searchable && (
          <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-ink-5" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onSearchKey}
              placeholder="Tìm nhanh..."
              aria-label="Tìm nhanh"
              className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-5"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-ink-5 hover:text-ink-3" aria-label="Xoá từ khoá">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div ref={listRef} className="thin-scroll max-h-60 overflow-y-auto">
          {filtered.map((opt, i) => {
            const isSel = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                onMouseEnter={() => searchable && setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-subtle',
                  searchable && i === active && 'bg-subtle',
                  isSel ? 'bg-brand-tint/60 font-medium text-brand-ink' : 'text-ink',
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSel && <Check className="h-3.5 w-3.5 shrink-0 text-brand-ink" />}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-center text-xs text-ink-4">Không có kết quả</p>
          )}
        </div>
      </Popover>
    </div>
  )
}

/**
 * Trường ngày gạch chân hỗ trợ vừa gõ trực tiếp dd/mm/yyyy vừa bấm mở lịch
 */
export function UnderlineDateField({
  label,
  required,
  value,
  onChange,
  min,
  max,
  error,
  className,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  error?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => isoToDisplay(value))
  const [cursor, setCursor] = useState(() => parseISODate(value || todayISO()))
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const handleInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)} / ${digits.slice(2)}`
    setText(formatted)
    if (digits.length === 0) {
      onChange('')
      return
    }
    if (digits.length === 8) {
      const dd = Number(digits.slice(0, 2))
      const mm = Number(digits.slice(2, 4))
      const yyyy = Number(digits.slice(4, 8))
      const dt = new Date(yyyy, mm - 1, dd)
      if (
        yyyy >= 1900 &&
        dt.getFullYear() === yyyy &&
        dt.getMonth() === mm - 1 &&
        dt.getDate() === dd
      ) {
        const iso = toISODate(dt)
        if ((!min || iso >= min) && (!max || iso <= max)) {
          onChange(iso)
        }
      }
    }
  }

  const today = todayISO()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const yearStart = Math.floor(year / 12) * 12
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1))),
  ]
  const outOfRange = (iso: string) => (min && iso < min) || (max && iso > max)

  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <div
        ref={wrapRef}
        className={cn(
          underlineBase,
          'mt-0.5 flex items-center justify-between gap-1',
          open && 'border-brand',
          error && 'border-danger',
        )}
      >
        <input
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={() => setText(isoToDisplay(value))}
          placeholder="dd / mm / yyyy"
          inputMode="numeric"
          className="w-full bg-transparent text-[13px] text-ink tabular-nums outline-none placeholder:text-ink-5"
        />
        <button
          type="button"
          onClick={() => {
            setCursor(parseISODate(value || todayISO()))
            setView('days')
            setOpen((o) => !o)
          }}
          aria-label="Chọn ngày"
          className="shrink-0 text-ink-4 hover:text-ink"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-danger-ink">{error}</p>}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={wrapRef} className="w-[252px] p-3">
        <div className="select-none">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCursor(
                  view === 'days'
                    ? new Date(year, month - 1, 1)
                    : view === 'months'
                      ? new Date(year - 1, month, 1)
                      : new Date(year - 12, month, 1),
                )
              }
              className="flex h-7 w-7 items-center justify-center rounded border border-line text-xs hover:bg-canvas"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'days' ? 'months' : 'years')}
              className="rounded px-2 py-1 text-[13px] font-semibold text-ink hover:bg-subtle"
            >
              {view === 'days'
                ? `Tháng ${month + 1} Năm ${year}`
                : view === 'months'
                  ? `Năm ${year}`
                  : `${yearStart} – ${yearStart + 11}`}
            </button>
            <button
              type="button"
              onClick={() =>
                setCursor(
                  view === 'days'
                    ? new Date(year, month + 1, 1)
                    : view === 'months'
                      ? new Date(year + 1, month, 1)
                      : new Date(year + 12, month, 1),
                )
              }
              className="flex h-7 w-7 items-center justify-center rounded border border-line text-xs hover:bg-canvas"
            >
              ›
            </button>
          </div>

          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 text-center text-[11px] text-ink-4">
                {WEEKDAYS_VN.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {cells.map((iso, i) =>
                  iso ? (
                    <button
                      key={iso}
                      type="button"
                      disabled={!!outOfRange(iso)}
                      onClick={() => {
                        onChange(iso)
                        setOpen(false)
                      }}
                      className={cn(
                        'mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[13px] text-ink hover:bg-subtle disabled:pointer-events-none disabled:text-line-strong',
                        iso === today && iso !== value && 'font-semibold text-brand-ink ring-1 ring-brand-line',
                        iso === value && 'bg-brand font-semibold text-white hover:bg-brand',
                      )}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  ) : (
                    <span key={`empty_${i}`} />
                  ),
                )}
              </div>
            </>
          )}

          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCursor(new Date(year, i, 1))
                    setView('days')
                  }}
                  className={cn('h-9 rounded-md text-[13px] hover:bg-subtle', i === month && 'bg-brand-tint font-semibold text-brand-ink')}
                >
                  Th {i + 1}
                </button>
              ))}
            </div>
          )}

          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((yy) => (
                <button
                  key={yy}
                  type="button"
                  onClick={() => {
                    setCursor(new Date(yy, month, 1))
                    setView('months')
                  }}
                  className={cn('h-9 rounded-md text-[13px] hover:bg-subtle', yy === year && 'bg-brand-tint font-semibold text-brand-ink')}
                >
                  {yy}
                </button>
              ))}
            </div>
          )}
        </div>
      </Popover>
    </div>
  )
}

function isoToDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d} / ${m} / ${y}` : ''
}

/** Ô chỉ số sinh hiệu gạch chân có đơn vị */
export function VitalUnderlineInput({
  label,
  unit,
  value,
  onChange,
  readOnly,
}: {
  label: string
  unit: string
  value: string
  onChange?: (val: string) => void
  readOnly?: boolean
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className={cn(underlineBase, 'mt-0.5 flex items-center justify-between gap-2')}>
        <input
          value={value}
          readOnly={readOnly}
          inputMode="decimal"
          placeholder={unit}
          onChange={(e) => onChange?.(e.target.value.replace(/[^\d.,]/g, ''))}
          className={cn(
            'w-full bg-transparent text-[13px] text-ink tabular-nums outline-none placeholder:text-ink-5',
            readOnly && 'text-ink-2',
          )}
        />
        {value && <span className="shrink-0 text-[11.5px] text-ink-4">{unit}</span>}
      </div>
    </div>
  )
}

export function formatSummaryCounter(val: number) {
  return formatNumber(Math.round(val))
}
