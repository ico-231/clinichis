import { useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover } from './Popover'
import { FieldShell, inputBase, inputError } from './Field'
import { cn } from '@/lib/cn'
import { parseISODate, toISODate, todayISO, WEEKDAYS_VN } from '@/lib/date'

interface DatePickerProps {
  label?: string
  required?: boolean
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  error?: string
  className?: string
  placeholder?: string
}

type View = 'days' | 'months' | 'years'

export function DatePicker({ label, required, value, onChange, min, max, error, className, placeholder = 'dd / mm / yyyy' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [view, setView] = useState<View>('days')
  const [cursor, setCursor] = useState(() => parseISODate(value || todayISO()))

  const show = () => {
    setCursor(parseISODate(value || todayISO()))
    setView('days')
    setOpen(true)
  }

  const [y, m, d] = value ? value.split('-') : []

  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(inputBase, 'flex items-center justify-between gap-2 tabular-nums', open && 'border-blue-500 ring-2 ring-blue-500/15', error && inputError)}
      >
        {value ? (
          <span className="tracking-wide text-slate-900">
            {d}
            <span className="mx-1 text-slate-300">/</span>
            {m}
            <span className="mx-1 text-slate-300">/</span>
            {y}
          </span>
        ) : (
          <span className="text-slate-500">{placeholder}</span>
        )}
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} className="w-[252px] p-3">
        <Calendar
          value={value}
          min={min}
          max={max}
          view={view}
          setView={setView}
          cursor={cursor}
          setCursor={setCursor}
          onSelect={(iso) => {
            onChange(iso)
            setOpen(false)
          }}
        />
      </Popover>
    </FieldShell>
  )
}

interface CalendarProps {
  value: string
  min?: string
  max?: string
  view: View
  setView: (v: View) => void
  cursor: Date
  setCursor: (d: Date) => void
  onSelect: (iso: string) => void
}

function Calendar({ value, min, max, view, setView, cursor, setCursor, onSelect }: CalendarProps) {
  const today = todayISO()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const navBtn = 'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50'

  const step = (dir: 1 | -1) => {
    if (view === 'days') setCursor(new Date(year, month + dir, 1))
    else if (view === 'months') setCursor(new Date(year + dir, month, 1))
    else setCursor(new Date(year + dir * 12, month, 1))
  }

  const yearStart = Math.floor(year / 12) * 12
  const title =
    view === 'days' ? `Tháng ${month + 1} Năm ${year}` : view === 'months' ? `Năm ${year}` : `${yearStart} – ${yearStart + 11}`

  const outOfRange = (iso: string) => (min && iso < min) || (max && iso > max)

  // Lưới ngày bắt đầu từ Thứ 2
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1))),
  ]

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={navBtn} onClick={() => step(-1)} aria-label="Trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'days' ? 'months' : 'years')}
          className="rounded px-2 py-1 text-[13px] font-semibold text-slate-900 hover:bg-slate-100"
        >
          {title}
        </button>
        <button type="button" className={navBtn} onClick={() => step(1)} aria-label="Sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {view === 'days' && (
        <>
          <div className="grid grid-cols-7 text-center text-[11px] text-slate-500">
            {WEEKDAYS_VN.map((w) => (
              <div key={w} className="py-1.5">
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
                  onClick={() => onSelect(iso)}
                  className={cn(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[13px] text-slate-800 transition hover:bg-slate-100 disabled:pointer-events-none disabled:text-slate-300',
                    iso === today && iso !== value && 'font-semibold text-blue-600 ring-1 ring-blue-200',
                    iso === value && 'bg-blue-600 font-semibold text-white hover:bg-blue-600',
                  )}
                >
                  {Number(iso.slice(8))}
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
            <button type="button" className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-300" disabled={!!outOfRange(today)} onClick={() => onSelect(today)}>
              Hôm nay
            </button>
            <span className="text-[11px] text-slate-500">Bấm tiêu đề để chọn tháng/năm</span>
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
              className={cn('h-9 rounded-md text-[13px] hover:bg-slate-100', i === month && 'bg-blue-50 font-semibold text-blue-700')}
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
              className={cn('h-9 rounded-md text-[13px] hover:bg-slate-100', yy === year && 'bg-blue-50 font-semibold text-blue-700')}
            >
              {yy}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
