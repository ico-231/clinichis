import type { ReactNode } from 'react'

/** Minh họa hộp isometric (màu theo token nên đổi được sáng/tối) */
export function EmptyIllustration({ className = 'h-[92px] w-[150px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 92" className={className} fill="none" aria-hidden>
      <path d="M22 40c-6-14 10-24 30-26 18-2 26-12 44-10 18 2 34 6 36 20 2 12-6 18-4 28 2 14-12 30-40 34-26 4-52-2-62-14-8-10 2-20-4-32Z" className="fill-brand-soft stroke-ink-2" strokeWidth="1.6" />
      <path d="M30 50 72 28l44 22-42 22-44-22Z" className="fill-brand stroke-ink-2" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M30 50v8l44 22v-8L30 50Z" className="fill-brand-strong stroke-ink-2" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M74 72v8l42-22v-8L74 72Z" className="fill-brand-line stroke-ink-2" strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="73" cy="50" rx="9" ry="5" className="fill-brand-tint" />
      <ellipse cx="114" cy="28" rx="9" ry="5" className="fill-accent stroke-ink-2" strokeWidth="1.6" />
      <path d="M105 28v3c0 3 4 5 9 5s9-2 9-5v-3" className="fill-accent-strong stroke-ink-2" strokeWidth="1.6" />
      <path d="M111 27h6" className="stroke-surface" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** Minh họa 2 tờ hồ sơ xếp chồng (dùng cho Cận lâm sàng & danh sách chỉ định) */
export function DocumentsEmptyIllustration({ className = 'h-[76px] w-[92px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 80" className={className} fill="none" aria-hidden>
      <rect x="14" y="16" width="44" height="52" rx="8" transform="rotate(-8 14 16)" className="fill-subtle stroke-line" strokeWidth="1.5" />
      <rect x="30" y="10" width="46" height="56" rx="8" className="fill-canvas stroke-line-strong" strokeWidth="1.5" />
      <rect x="39" y="24" width="26" height="4" rx="2" className="fill-line-strong" />
      <rect x="39" y="34" width="28" height="4" rx="2" className="fill-line" />
      <rect x="39" y="44" width="20" height="4" rx="2" className="fill-line" />
    </svg>
  )
}

export function EmptyState({ title = 'Không có dữ liệu', description, action }: { title?: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      <EmptyIllustration />
      <p className="mt-1 text-[13.5px] font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-[12.5px] text-ink-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
