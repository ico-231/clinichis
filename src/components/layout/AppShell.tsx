import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Loader2 } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { useToast } from '@/components/ui/Toast'
import { applyTheme } from '@/lib/theme'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { ReceptionPage } from '@/features/reception/ReceptionPage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'
import { findNav } from '@/navigation'
import type { RouteKey } from '@/store/types'

/** Tải màn hình theo nhu cầu (tách bundle) – Lễ tân tải sẵn vì là màn mặc định */
const page = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => loader().then((m) => ({ default: m[name] })))

const ExaminationPage = page(() => import('@/features/examination/ExaminationPage'), 'ExaminationPage')
const ImagingPage = page(() => import('@/features/paraclinical/routes'), 'ImagingPage')
const LabPage = page(() => import('@/features/paraclinical/routes'), 'LabPage')
const ClsReportPage = page(() => import('@/features/paraclinical/ClsReportPage'), 'ClsReportPage')
const ClsSettingsPage = page(() => import('@/features/paraclinical/ClsSettingsPage'), 'ClsSettingsPage')
const PatientsPage = page(() => import('@/features/patients/PatientsPage'), 'PatientsPage')
const EmrPage = page(() => import('@/features/emr/EmrPage'), 'EmrPage')
const DashboardPage = page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const ReportsPage = page(() => import('@/features/reports/ReportsPage'), 'ReportsPage')
const SchedulePage = page(() => import('@/features/schedule/SchedulePage'), 'SchedulePage')
const AppointmentsPage = page(() => import('@/features/schedule/AppointmentsPage'), 'AppointmentsPage')
const SystemPage = page(() => import('@/features/system/SystemPage'), 'SystemPage')

/**
 * Điều hướng dựa trên state (không phụ thuộc router) để dễ chuyển sang
 * Next.js App Router sau này: mỗi RouteKey tương ứng một app/(clinic)/<route>/page.tsx.
 * Route không có trong bảng (chưa có ảnh tham chiếu) hiển thị trang chờ.
 */
const SCREENS: Partial<Record<RouteKey, ComponentType>> = {
  reception: ReceptionPage,
  examination: ExaminationPage,
  imaging: ImagingPage,
  lab: LabPage,
  'paraclinical-reports': ClsReportPage,
  'paraclinical-settings': ClsSettingsPage,
  patients: PatientsPage,
  emr: EmrPage,
  dashboard: DashboardPage,
  reports: ReportsPage,
  schedule: SchedulePage,
  appointments: AppointmentsPage,
  system: SystemPage,
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[13px] text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải màn hình...
    </div>
  )
}

export function AppShell() {
  const { ui } = useClinicState()
  const { resetDemoData } = useClinicActions()
  const toast = useToast()
  useEffect(() => applyTheme(ui.theme ?? 'light'), [ui.theme])
  // Tiêu đề tab theo màn đang mở (dễ phân biệt khi mở nhiều tab / lịch sử trình duyệt)
  useEffect(() => {
    const nav = findNav(ui.activeRoute)
    const label = ui.activeRoute === 'paraclinical-settings' ? 'Thiết lập CLS' : nav?.label
    document.title = label ? `${label} · ClinicHIS` : 'ClinicHIS — Phòng khám Nhi Khoa'
  }, [ui.activeRoute])
  useEffect(() => {
    const onFull = () =>
      toast({ title: 'Bộ nhớ trình duyệt đã đầy', description: 'Thay đổi mới nhất chưa được lưu. Hãy xoá bớt ảnh / tệp kết quả lớn.', tone: 'warning' })
    window.addEventListener('clinic:storage-full', onFull)
    return () => window.removeEventListener('clinic:storage-full', onFull)
  }, [toast])
  const Screen = SCREENS[ui.activeRoute]
  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {/* Người dùng bàn phím: Tab đầu tiên cho phép bỏ qua menu */}
      <a
        href="#main-content"
        onClick={(e) => {
          // Không đổi URL (#main-content), chỉ chuyển tiêu điểm vào vùng nội dung
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="fixed top-2 left-2 z-[100] -translate-y-[200%] rounded-md bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Bỏ qua menu, tới nội dung chính
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {/* key theo route: chuyển màn khác là thử hiển thị lại từ đầu */}
        <ErrorBoundary key={ui.activeRoute} onResetData={resetDemoData}>
          <Suspense fallback={<Loading />}>{Screen ? <Screen key={ui.activeRoute} /> : <PlaceholderPage key={ui.activeRoute} route={ui.activeRoute} />}</Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
