import type { ReactNode } from 'react'
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
  if (variant === 'pill') {
    return (
      <div role="tablist" className={cn('inline-flex rounded-[10px] border border-line-strong bg-surface p-[3px]', className)}>
        {items.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={t.value === value}
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
    <div role="tablist" className={cn('flex gap-5 border-b border-line', className)}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
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
