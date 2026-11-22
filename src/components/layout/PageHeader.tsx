import type { ReactNode } from 'react'
import { PanelLeft } from 'lucide-react'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  const { ui } = useClinicState()
  const { setUI } = useClinicActions()
  return (
    <header className="flex h-[50px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button
        type="button"
        onClick={() => setUI({ sidebarCollapsed: !ui.sidebarCollapsed })}
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Thu gọn / mở rộng menu"
        title="Thu gọn / mở rộng menu"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      <span className="h-5 w-px bg-slate-200" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">{title}</h1>
        {subtitle && <span className="truncate text-[12.5px] text-slate-500">{subtitle}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
