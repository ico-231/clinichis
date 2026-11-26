import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="shrink-0 bg-canvas">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-3.5 pb-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{title}</h1>
          {subtitle && <div className="mt-0.5 truncate text-[13px] text-ink-3">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
      </div>
    </header>
  )
}
