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
      <div role="tablist" className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
        {items.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={t.value === value}
            onClick={() => onChange(t.value)}
            className={cn(
              'rounded-md px-3 py-1 text-[13px] font-medium transition',
              t.value === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div role="tablist" className={cn('flex gap-5 border-b border-slate-200', className)}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-medium transition',
            t.value === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-[11px]', t.value === value ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
