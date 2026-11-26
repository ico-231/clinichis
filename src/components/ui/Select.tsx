import { useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover } from './Popover'
import { FieldShell, inputBase, inputError } from './Field'
import { cn } from '@/lib/cn'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  hint?: ReactNode
}

interface SelectProps<T extends string> {
  label?: string
  required?: boolean
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  error?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  menuMinWidth?: number
}

export function Select<T extends string>({
  label,
  required,
  value,
  options,
  onChange,
  placeholder = 'Chọn',
  error,
  className,
  triggerClassName,
  disabled,
  menuMinWidth,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((o) => o.value === value)

  const openMenu = () => {
    setActive(Math.max(options.findIndex((o) => o.value === value), 0))
    setOpen(true)
  }
  const choose = (v: T) => {
    onChange(v)
    setOpen(false)
    anchorRef.current?.focus()
  }

  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${selected?.label ?? placeholder}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) return openMenu()
            setActive((i) => (e.key === 'ArrowDown' ? Math.min(i + 1, options.length - 1) : Math.max(i - 1, 0)))
          } else if (e.key === 'Enter' && open && active >= 0) {
            e.preventDefault()
            choose(options[active].value)
          }
        }}
        className={cn(
          inputBase,
          'flex items-center justify-between gap-2 text-left',
          open && 'border-brand ring-2 ring-brand/15',
          error && inputError,
          triggerClassName,
        )}
      >
        <span className={cn('truncate', !selected && 'text-ink-3/70')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} matchWidth className="py-1">
        <ul role="listbox" className="max-h-72 overflow-auto" style={{ minWidth: menuMinWidth }}>
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-[7px] text-left text-[13px] text-ink',
                    i === active && 'bg-subtle',
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-ink-3">{o.hint}</span>}
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-brand-ink" /> : <span className="w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      </Popover>
    </FieldShell>
  )
}
