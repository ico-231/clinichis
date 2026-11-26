import { useEffect, useState } from 'react'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { AccountSection, AppearanceSection, ClinicSection, EmrLogSection, FeeSection, GeneralSection, OrgSection, StaffSection } from './systemSections'

type Key = 'clinic' | 'account' | 'appearance' | 'einvoice' | 'general' | 'staff' | 'org' | 'fee' | 'emrlog'

const GROUPS: { title?: string; items: { key: Key; label: string }[] }[] = [
  {
    items: [
      { key: 'clinic', label: 'Thông tin phòng khám' },
      { key: 'account', label: 'Tài khoản cá nhân' },
      { key: 'appearance', label: 'Giao diện' },
      { key: 'einvoice', label: 'Hoá đơn điện tử' },
    ],
  },
  {
    title: 'Phòng khám',
    items: [
      { key: 'general', label: 'Cài đặt chung' },
      { key: 'staff', label: 'Nhân viên' },
      { key: 'org', label: 'Cơ cấu tổ chức' },
      { key: 'fee', label: 'Tiền công khám' },
    ],
  },
  { title: 'Lịch sử truy cập', items: [{ key: 'emrlog', label: 'Truy cập bệnh án điện tử' }] },
]

/** Quản lý › Hệ thống (ảnh 155–176) */
export function SystemPage() {
  const { ui } = useClinicState()
  const { setUI } = useClinicActions()
  const isKey = (k: unknown): k is Key => GROUPS.some((g) => g.items.some((i) => i.key === k))
  const [key, setKey] = useState<Key>(() => (isKey(ui.systemSection) ? ui.systemSection : 'clinic'))
  // Mở đúng mục khi được gọi từ nơi khác (vd. menu tài khoản › Hồ sơ cá nhân), kể cả khi đang ở màn này
  useEffect(() => {
    if (!ui.systemSection) return
    if (isKey(ui.systemSection)) setKey(ui.systemSection)
    setUI({ systemSection: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.systemSection])
  const label = GROUPS.flatMap((g) => g.items).find((i) => i.key === key)!.label
  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title={label} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 gap-4 overflow-hidden px-4 sm:px-6 2xl:px-8 pt-1 pb-4 max-md:flex-col">
        {/* Màn hẹp: danh mục thành thanh tab cuộn ngang phía trên */}
        <nav
          className="thin-scroll shrink-0 rounded-[16px] border border-line bg-surface p-2.5 text-[13px] max-md:flex max-md:gap-1 max-md:overflow-x-auto md:w-[220px] md:space-y-3"
          aria-label="Danh mục hệ thống"
        >
          {GROUPS.map((g, i) => (
            <div key={i} className="max-md:contents">
              {g.title && <p className="px-2.5 pb-1 text-[11px] font-bold tracking-[0.04em] text-ink-4 uppercase max-md:hidden">{g.title}</p>}
              {g.items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setKey(it.key)}
                  className={cn(
                    'rounded-[10px] px-3 py-2 text-left transition-colors max-md:shrink-0 max-md:whitespace-nowrap md:w-full',
                    key === it.key ? 'bg-brand-soft font-semibold text-brand-ink' : 'font-medium text-ink-2 hover:bg-canvas hover:text-ink',
                  )}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto rounded-[16px] border border-line bg-surface p-5">
          {key === 'clinic' && <ClinicSection />}
          {key === 'account' && <AccountSection />}
          {key === 'appearance' && <AppearanceSection />}
          {key === 'general' && <GeneralSection />}
          {key === 'staff' && <StaffSection />}
          {key === 'org' && <OrgSection />}
          {key === 'fee' && <FeeSection />}
          {key === 'emrlog' && <EmrLogSection />}
          {key === 'einvoice' && (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="Cài đặt hoá đơn điện tử chưa có trong bản demo" description="Thông tin hoá đơn vẫn nhập được khi thu tiền (bật “Phát hành hoá đơn”)." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
