import { useMemo } from 'react'
import { ChevronRight, ChevronsUpDown, Crown, LogOut, RotateCcw, UserRound, X } from 'lucide-react'
import { NAV_SECTIONS } from '@/navigation'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { CLINIC } from '@/store/catalog'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { todayISO } from '@/lib/date'
import type { RouteKey } from '@/store/types'

export function Sidebar() {
  const { ui, visits } = useClinicState()
  const { navigate, setUI, resetDemoData } = useClinicActions()
  const toast = useToast()
  const collapsed = ui.sidebarCollapsed

  // Bộ đếm trên menu lấy trực tiếp từ store dùng chung
  const counters = useMemo(() => {
    const today = todayISO()
    const todays = visits.filter((v) => v.date === today)
    return {
      reception: todays.filter((v) => v.status === 'registered' || v.status === 'waiting').length,
      examination: todays.filter((v) => v.status === 'waiting' || v.status === 'in_progress').length,
    } as Partial<Record<RouteKey, number>>
  }, [visits])

  return (
    <aside className={cn('flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200', collapsed ? 'w-[64px]' : 'w-[230px]')}>
      {/* Thương hiệu */}
      <div className={cn('flex h-[52px] shrink-0 items-center gap-2.5', collapsed ? 'justify-center px-2' : 'px-3')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-sm font-bold text-white shadow-sm">{CLINIC.shortName}</div>
        {!collapsed && <span className="truncate text-[14px] font-medium text-slate-900">{CLINIC.name}</span>}
      </div>

      {/* Điều hướng */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 pt-3 pb-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={cn(si > 0 && (collapsed ? 'mt-2 border-t border-slate-100 pt-2' : 'mt-3'))}>
            {section.title && !collapsed && <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = ui.activeRoute === item.key
                const Icon = item.icon
                const count = counters[item.key]
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      title={collapsed ? item.label : undefined}
                      onClick={() => navigate(item.key)}
                      className={cn(
                        'group relative flex h-8 w-full items-center gap-2.5 rounded-md text-[13.5px] transition-colors',
                        collapsed ? 'justify-center' : 'px-2',
                        active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', item.color)} strokeWidth={2.2} />
                      {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                      {!!count && !collapsed && (
                        <span className={cn('rounded-full px-1.5 text-[11px] leading-[18px] font-semibold', active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700')}>{count}</span>
                      )}
                      {!!count && collapsed && <span className="absolute top-1 right-2 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Chân sidebar */}
      <div className="shrink-0 border-t border-slate-200 p-2">
        {!collapsed && !ui.upgradeCardDismissed && (
          <div className="mb-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
                  <Crown className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <span className="text-[14px] font-semibold text-slate-900">Standard</span>
              </div>
              <button type="button" onClick={() => setUI({ upgradeCardDismissed: true })} className="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Ẩn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-medium text-blue-600 hover:underline">
              Nâng cấp ngay <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <DropdownMenu
          align="start"
          className="w-56"
          renderTrigger={({ ref, toggle }) => (
            <button ref={ref} type="button" onClick={toggle} className={cn('flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-slate-50', collapsed && 'justify-center')}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-400 text-xs font-semibold text-white">NN</span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-900">Nguyễn Đắc Nghĩa</span>
                    <span className="block truncate text-[11.5px] text-slate-500">Quản trị viên</span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-slate-500" />
                </>
              )}
            </button>
          )}
        >
          <MenuItem icon={<UserRound className="h-4 w-4" />}>Hồ sơ cá nhân</MenuItem>
          <MenuItem
            icon={<RotateCcw className="h-4 w-4" />}
            onSelect={() => {
              resetDemoData()
              toast({ title: 'Đã khôi phục dữ liệu mẫu', tone: 'info' })
            }}
          >
            Khôi phục dữ liệu mẫu
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<LogOut className="h-4 w-4" />} danger>
            Đăng xuất
          </MenuItem>
        </DropdownMenu>
        {!collapsed && <p className="mt-1 px-1.5 text-[10.5px] text-slate-400">ClinicHIS 0.1.0 · Bản demo</p>}
      </div>
    </aside>
  )
}
