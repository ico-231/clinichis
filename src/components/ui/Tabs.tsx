import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', className }: TabsProps<T>) {
  // Mẫu tab của ARIA: chỉ tab đang chọn nằm trong thứ tự Tab, mũi tên trái/phải chuyển tab
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = items.findIndex((t) => t.value === value)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    onChange(items[next].value)
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons[next]?.focus()
  }
  if (variant === 'pill') {
    return (
      <div role="tablist" onKeyDown={onKeyDown} className={cn('inline-flex rounded-[10px] border border-line-strong bg-surface p-[3px]', className)}>
        {items.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={t.value === value}
            tabIndex={t.value === value ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'rounded-[7px] px-3 py-1 text-[13px] font-semibold transition',
              t.value === value ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div role="tablist" onKeyDown={onKeyDown} className={cn('flex gap-5 border-b border-line', className)}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
            tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-semibold transition',
            t.value === value ? 'border-brand text-brand-ink' : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-[11.5px]', t.value === value ? 'bg-brand-soft text-brand-ink' : 'bg-subtle text-ink-3')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
