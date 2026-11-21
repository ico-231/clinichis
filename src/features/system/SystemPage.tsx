import { useState } from 'react'
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
  const [key, setKey] = useState<Key>('clinic')
  const label = GROUPS.flatMap((g) => g.items).find((i) => i.key === key)!.label
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={label} />
      <div className="flex min-h-0 flex-1">
        <nav className="w-[200px] shrink-0 space-y-3 border-r border-slate-200 bg-slate-50/60 p-2 text-[13px]" aria-label="Danh mục hệ thống">
          {GROUPS.map((g, i) => (
            <div key={i}>
              {g.title && <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{g.title}</p>}
              {g.items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setKey(it.key)}
                  className={cn('w-full rounded-md px-2.5 py-1.5 text-left', key === it.key ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-700 hover:bg-white/70')}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto p-4">
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
              <EmptyState title="Hoá đơn điện tử đang chờ thiết kế" description="Chưa có ảnh tham chiếu cho mục này – giữ trang chờ theo kế hoạch." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
