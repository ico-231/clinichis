import { useMemo } from 'react'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { findNav, PlaceholderIcon } from '@/navigation'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { todayISO } from '@/lib/date'
import type { RouteKey } from '@/store/types'

/** Trang chờ cho các màn hình phụ chưa mở chi tiết – giữ số liệu đồng bộ 6C từ store */
export function PlaceholderPage({ route }: { route: RouteKey }) {
  const nav = findNav(route) ?? { label: 'Màn hình', section: undefined, icon: PlaceholderIcon, description: '' }
  const Icon = nav.icon
  const { patients, visits } = useClinicState()
  const { navigate } = useClinicActions()

  const stats = useMemo(() => {
    const today = todayISO()
    const t = visits.filter((v) => v.date === today)
    return [
      { label: 'Hồ sơ người bệnh', value: patients.length, tone: 'neutral' as const },
      { label: 'Lượt khám hôm nay', value: t.length, tone: 'neutral' as const },
      { label: 'Đang chờ khám', value: t.filter((v) => v.status === 'waiting').length, tone: 'peach' as const },
      { label: 'Đang khám', value: t.filter((v) => v.status === 'in_progress').length, tone: 'mint' as const },
    ]
  }, [patients, visits])

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title={nav.label} subtitle={nav.section} />
      <div className="flex flex-1 items-center justify-center overflow-auto bg-canvas p-8">
        <div className="w-full max-w-2xl rounded-[18px] border border-line bg-surface p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-brand-line bg-brand-tint text-brand-ink">
            <Icon className="h-5 w-5" strokeWidth={2.1} />
          </div>
          <h2 className="mt-4 text-[19px] font-bold text-ink">Phân hệ “{nav.label}”</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{nav.description}</p>
          <p className="mt-2 text-[13px] text-ink-3">
            Phân hệ này đang được hoàn thiện. Các việc hằng ngày vẫn làm ở Lễ tân và Khám bệnh.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className={
                  s.tone === 'mint'
                    ? 'rounded-[14px] border border-brand-line bg-brand-tint p-3.5'
                    : s.tone === 'peach'
                      ? 'rounded-[14px] border border-accent-line bg-accent-tint p-3.5'
                      : 'rounded-[14px] border border-line bg-canvas p-3.5'
                }
              >
                <p
                  className={
                    s.tone === 'mint'
                      ? 'text-2xl font-bold text-brand-ink tabular-nums'
                      : s.tone === 'peach'
                        ? 'text-2xl font-bold text-accent-ink tabular-nums'
                        : 'text-2xl font-bold text-ink tabular-nums'
                  }
                >
                  {s.value}
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-ink-2">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button leftIcon={<Stethoscope className="h-4 w-4" />} onClick={() => navigate('examination')}>
              Mở màn Khám bệnh
            </Button>
            <Button variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('reception')}>
              Về quầy Lễ tân
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
