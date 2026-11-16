import type { ReactNode } from 'react'

/** Minh họa hộp isometric giống hệ thống gốc */
export function EmptyIllustration({ className = 'h-[92px] w-[150px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 92" className={className} fill="none" aria-hidden>
      <path d="M22 40c-6-14 10-24 30-26 18-2 26-12 44-10 18 2 34 6 36 20 2 12-6 18-4 28 2 14-12 30-40 34-26 4-52-2-62-14-8-10 2-20-4-32Z" fill="#CFF4FC" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M30 50 72 28l44 22-42 22-44-22Z" fill="#3B82F6" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M30 50v8l44 22v-8L30 50Z" fill="#1D4ED8" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M74 72v8l42-22v-8L74 72Z" fill="#2563EB" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="73" cy="50" rx="9" ry="5" fill="#DBEAFE" />
      <ellipse cx="114" cy="28" rx="9" ry="5" fill="#3B82F6" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M105 28v3c0 3 4 5 9 5s9-2 9-5v-3" fill="#1D4ED8" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M111 27h6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** Minh họa 2 tờ hồ sơ xếp chồng (dùng cho Cận lâm sàng & danh sách chỉ định) */
export function DocumentsEmptyIllustration({ className = 'h-[76px] w-[92px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 80" className={className} fill="none" aria-hidden>
      <rect x="14" y="16" width="44" height="52" rx="8" transform="rotate(-8 14 16)" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="30" y="10" width="46" height="56" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="39" y="24" width="26" height="4" rx="2" fill="#CBD5E1" />
      <rect x="39" y="34" width="28" height="4" rx="2" fill="#E2E8F0" />
      <rect x="39" y="44" width="20" height="4" rx="2" fill="#E2E8F0" />
    </svg>
  )
}

export function EmptyState({ title = 'Không có dữ liệu', description, action }: { title?: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
      <EmptyIllustration />
      <p className="text-[13px] font-medium text-slate-800">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
