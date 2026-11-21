import { useMemo } from 'react'
import { ArrowRight, Database, ImagePlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { findNav, PlaceholderIcon } from '@/navigation'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { todayISO } from '@/lib/date'
import type { RouteKey } from '@/store/types'

/** Trang chờ cho các màn hình chưa có ảnh thiết kế – vẫn đọc dữ liệu từ store dùng chung */
export function PlaceholderPage({ route }: { route: RouteKey }) {
  const nav = findNav(route) ?? { label: 'Màn hình', section: undefined, icon: PlaceholderIcon, color: 'text-slate-500', description: '' }
  const Icon = nav.icon
  const { patients, visits } = useClinicState()
  const { navigate } = useClinicActions()

  const stats = useMemo(() => {
    const today = todayISO()
    const t = visits.filter((v) => v.date === today)
    return [
      { label: 'Hồ sơ người bệnh', value: patients.length },
      { label: 'Lượt khám hôm nay', value: t.length },
      { label: 'Đang chờ khám', value: t.filter((v) => v.status === 'waiting').length },
      { label: 'Đang khám', value: t.filter((v) => v.status === 'in_progress').length },
    ]
  }, [patients, visits])

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={nav.label} subtitle={nav.section} />
      <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50/60 p-8">
        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
            <Icon className={`h-5 w-5 ${nav.color}`} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Màn hình “{nav.label}” đang chờ thiết kế</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{nav.description}</p>
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-500">
            <ImagePlus className="h-4 w-4" /> Gửi ảnh chụp màn hình tương ứng để dựng chi tiết ở bước tiếp theo.
          </p>

          <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <Database className="h-3.5 w-3.5" /> Dữ liệu dùng chung (store tập trung)
            </p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-xl font-semibold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-[11.5px] leading-tight text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" className="mt-6" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('reception')}>
            Về màn hình Lễ tân
          </Button>
        </div>
      </div>
    </div>
  )
}
