import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, LayoutDashboard, LogOut, Menu, Plus, RotateCcw, UserRound, X } from 'lucide-react'
import { NAV_SECTIONS } from '@/navigation'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { CLINIC } from '@/store/catalog'
import { initials } from '@/lib/format'
import { todayISO } from '@/lib/date'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { RouteKey } from '@/store/types'

/** Dưới mốc lg (1024px) menu ngang không đủ chỗ: chuyển thành ngăn kéo bên trái */
const COMPACT_QUERY = '(max-width: 1023px)'

const navBtn = (active: boolean) =>
  cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[11px] px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
    active ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink',
  )

function CountPill({ value, active }: { value?: number; active?: boolean }) {
  if (!value) return null
  return (
    <span className={cn('rounded-full px-1.5 text-[11.5px] leading-[18px] font-bold tabular-nums', active ? 'bg-brand text-white' : 'bg-accent-soft text-accent-ink')}>
      {value}
    </span>
  )
}

export function TopNav() {
  const { ui, visits, system } = useClinicState()
  const { navigate, setUI, resetDemoData } = useClinicActions()
  const toast = useToast()
  const compact = useMediaQuery(COMPACT_QUERY)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!compact) setMenuOpen(false)
  }, [compact])

  const account = system?.account
  const userName = account ? `${account.lastName} ${account.firstName}` : 'Nguyễn Đắc Nghĩa'

  // Bộ đếm trực tiếp trên menu theo ngày hiện tại
  const counters = useMemo(() => {
    const today = todayISO()
    const todays = visits.filter((v) => v.date === today)
    return {
      reception: todays.filter((v) => v.status === 'registered' || v.status === 'waiting').length,
      examination: todays.filter((v) => v.status === 'waiting' || v.status === 'in_progress').length,
    } as Partial<Record<RouteKey, number>>
  }, [visits])

  const go = (key: RouteKey) => {
    navigate(key)
    setMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-[58px] shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex h-full w-full max-w-[1920px] items-center gap-2 px-3 sm:px-4 lg:gap-3 lg:px-6">
          {compact && (
            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-ink-2 hover:bg-subtle hover:text-ink"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Thương hiệu */}
          <button type="button" onClick={() => go('dashboard')} className="mr-1 flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl pr-1.5 text-left" title="Về Tổng quan">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-brand text-white">
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <span className={cn('truncate text-[15px] font-bold tracking-[-0.01em] whitespace-nowrap text-ink', !compact && 'hidden xl:inline')}>{CLINIC.name}</span>
          </button>

          {/* Menu ngang: 6 nhóm, đủ 14 mục */}
          {!compact ? (
            <nav aria-label="Menu chính" className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {NAV_SECTIONS.map((section, si) => {
                if (!section.title) {
                  const item = section.items[0]
                  if (!item) return null
                  const Icon = item.icon
                  const active = ui.activeRoute === item.key
                  return (
                    <button key={item.key} type="button" aria-current={active ? 'page' : undefined} onClick={() => go(item.key)} className={navBtn(active)}>
                      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={2.1} />
                      <span>{item.label}</span>
                    </button>
                  )
                }
                const GroupIcon = section.icon ?? LayoutDashboard
                const groupActive = section.items.some((item) => item.key === ui.activeRoute)
                const groupCount = section.items.reduce((n, item) => n + (item.key === 'reception' ? (counters.reception ?? 0) : 0), 0)
                return (
                  <DropdownMenu
                    key={section.title ?? si}
                    align="start"
                    className="w-60 p-1.5"
                    renderTrigger={({ ref, toggle, open }) => (
                      <button ref={ref} type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className={navBtn(groupActive || open)}>
                        <GroupIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={2.1} />
                        <span>{section.title}</span>
                        <CountPill value={groupCount} />
                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-70 transition-transform', open && 'rotate-180')} />
                      </button>
                    )}
                  >
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = ui.activeRoute === item.key
                        const ItemIcon = item.icon
                        return (
                          <MenuItem
                            key={item.key}
                            icon={<ItemIcon className="h-4 w-4" strokeWidth={2.1} />}
                            className={cn(active && 'bg-brand-soft font-semibold text-brand-ink hover:bg-brand-soft')}
                            onSelect={() => go(item.key)}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span>{item.label}</span>
                              <CountPill value={counters[item.key]} />
                            </span>
                          </MenuItem>
                        )
                      })}
                    </div>
                  </DropdownMenu>
                )
              })}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          {/* Tài khoản */}
          <div className="shrink-0 border-l border-line pl-2 lg:pl-3">
            <DropdownMenu
              align="end"
              className="w-56"
              renderTrigger={({ ref, toggle, open }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-label={`Tài khoản: ${userName}`}
                  className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-subtle"
                >
                  {account?.avatar ? (
                    <img src={account.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-line bg-accent-tint text-[12px] font-bold text-accent-ink">
                      {initials(userName)}
                    </span>
                  )}
                  <span className="hidden leading-[1.25] whitespace-nowrap xl:block">
                    <span className="block text-[13px] font-bold text-ink">{userName}</span>
                    <span className="block text-[12px] text-ink-3">Quản trị viên</span>
                  </span>
                </button>
              )}
            >
              <div className="border-b border-line px-3 pt-1.5 pb-2 xl:hidden">
                <p className="truncate text-[13px] font-bold text-ink">{userName}</p>
                <p className="text-[12px] text-ink-3">Quản trị viên</p>
              </div>
              <MenuItem
                icon={<UserRound className="h-4 w-4" />}
                onSelect={() => {
                  setUI({ systemSection: 'account' })
                  go('system')
                }}
              >
                Hồ sơ cá nhân
              </MenuItem>
              <MenuItem icon={<RotateCcw className="h-4 w-4" />} onSelect={() => setConfirmReset(true)}>
                Khôi phục dữ liệu mẫu
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={<LogOut className="h-4 w-4" />}
                danger
                onSelect={() => toast({ title: 'Bản demo không có đăng nhập', description: 'Dữ liệu chỉ lưu trên trình duyệt này, không gửi đi đâu.', tone: 'info' })}
              >
                Đăng xuất
              </MenuItem>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {compact && menuOpen && <NavDrawer activeRoute={ui.activeRoute} counters={counters} onGo={go} onClose={() => setMenuOpen(false)} />}

      <ConfirmDiscardModal
        open={confirmReset}
        title="Khôi phục dữ liệu mẫu?"
        description="Mọi người bệnh, lượt khám, phiếu thu và cài đặt đã nhập trên trình duyệt này sẽ được thay bằng dữ liệu mẫu. Không thể hoàn tác."
        cancelLabel="Huỷ"
        confirmLabel="Khôi phục"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false)
          resetDemoData()
          toast({ title: 'Đã khôi phục dữ liệu mẫu', tone: 'info' })
        }}
      />
    </>
  )
}

/** Ngăn kéo menu cho màn hẹp: đủ 14 mục theo nhóm, có số đếm */
function NavDrawer({
  activeRoute,
  counters,
  onGo,
  onClose,
}: {
  activeRoute: RouteKey
  counters: Partial<Record<RouteKey, number>>
  onGo: (key: RouteKey) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Giữ Tab trong ngăn kéo
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>('button')
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-overlay/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu chính"
        className="absolute inset-y-0 left-0 flex w-[288px] max-w-[86vw] animate-slide-in-left flex-col border-r border-line bg-surface shadow-pop"
      >
        <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-line px-4">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-brand text-white">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{CLINIC.name}</span>
          <button ref={closeRef} type="button" aria-label="Đóng menu" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-3 hover:bg-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Menu chính" className="thin-scroll flex-1 overflow-y-auto px-3 py-3">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className={cn(si > 0 && 'mt-3')}>
              {section.title && <p className="mb-1 px-2.5 text-[11.5px] font-semibold tracking-[0.04em] text-ink-4 uppercase">{section.title}</p>}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = activeRoute === item.key
                  const Icon = item.icon
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onGo(item.key)}
                        className={cn(
                          'flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-[14px] transition-colors',
                          active ? 'bg-brand-soft font-semibold text-brand-ink' : 'font-medium text-ink-2 hover:bg-subtle hover:text-ink',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        <span className="flex-1 truncate">{item.label}</span>
                        <CountPill value={counters[item.key]} active={active} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <p className="shrink-0 border-t border-line px-5 py-3 text-[11.5px] text-ink-4">ClinicHIS · Bản demo, dữ liệu lưu trên trình duyệt</p>
      </div>
    </div>
  )
}
