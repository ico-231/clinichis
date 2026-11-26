import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Popover } from './Popover'
import { cn } from '@/lib/cn'

/** Chuẩn hoá chuỗi gõ tay thành "HH:mm" 24 giờ; trả '' nếu không đọc được */
export function normalizeTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''
  let h: number
  let m: number
  if (raw.includes(':')) {
    const [a, b = ''] = raw.split(':')
    h = Number(a.replace(/\D/g, '') || 0)
    m = Number(b.replace(/\D/g, '').slice(0, 2) || 0)
  } else if (digits.length <= 2) {
    h = Number(digits)
    m = 0
  } else {
    h = Number(digits.slice(0, digits.length - 2))
    m = Number(digits.slice(-2))
  }
  if (!Number.isFinite(h) || h > 23 || m > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const SLOTS = Array.from({ length: (21 - 6) * 4 + 1 }, (_, i) => {
  const total = 6 * 60 + i * 15
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

/**
 * Ô giờ luôn 24 giờ (ô type="time" của trình duyệt đổi theo máy: "01:30 CH").
 * Gõ "1330", "13:30" hoặc "9" đều được; nút đồng hồ mở danh sách mốc 15 phút.
 */
export function TimeInput({ value, onChange, className, disabled, id, 'aria-label': ariaLabel }: TimeInputProps) {
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => setDraft(value), [value])

  // Mở danh sách: cuộn tới giờ đang chọn (Popover cần một nhịp để hiện ra nên thử lại vài lần)
  useEffect(() => {
    if (!open) return
    let tries = 0
    let timer = 0
    const scroll = () => {
      const list = listRef.current
      const el = list?.querySelector<HTMLElement>(`[data-t="${nearestSlot(value)}"]`)
      if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2
      else if (tries++ < 10) timer = window.setTimeout(scroll, 16)
    }
    scroll()
    return () => window.clearTimeout(timer)
  }, [open, value])

  const commit = () => {
    const t = normalizeTime(draft)
    if (t) {
      setDraft(t)
      if (t !== value) onChange(t)
    } else setDraft(value)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="--:--"
        maxLength={5}
        disabled={disabled}
        aria-label={ariaLabel}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d:]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        className={cn(className, 'pr-8 tabular-nums')}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Chọn giờ"
        onClick={() => setOpen((o) => !o)}
        className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-4 hover:bg-subtle hover:text-ink disabled:pointer-events-none"
      >
        <Clock3 className="h-3.5 w-3.5" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={wrapRef} matchWidth className="py-1">
        <ul ref={listRef} role="listbox" aria-label="Chọn giờ" className="thin-scroll relative max-h-56 overflow-y-auto">
          {SLOTS.map((t) => (
            <li key={t}>
              <button
                type="button"
                role="option"
                data-t={t}
                aria-selected={t === value}
                onClick={() => {
                  setOpen(false)
                  setDraft(t)
                  if (t !== value) onChange(t)
                }}
                className={cn('block w-full px-3 py-1.5 text-left text-[13px] tabular-nums hover:bg-subtle', t === value ? 'font-semibold text-brand-ink' : 'text-ink')}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  )
}

function nearestSlot(v: string) {
  const t = normalizeTime(v)
  if (!t) return '08:00'
  const [h, m] = t.split(':').map(Number)
  const total = Math.min(Math.max(h * 60 + Math.round(m / 15) * 15, 6 * 60), 21 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
