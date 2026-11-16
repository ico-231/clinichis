import { Sidebar } from './Sidebar'
import { useClinicState } from '@/store/ClinicStore'
import { ReceptionPage } from '@/features/reception/ReceptionPage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'
import type { RouteKey } from '@/store/types'

/**
 * Điều hướng dựa trên state (không phụ thuộc router) để dễ chuyển sang
 * Next.js App Router sau này: mỗi RouteKey tương ứng một app/(clinic)/<route>/page.tsx.
 */
const SCREENS: Partial<Record<RouteKey, () => React.ReactElement>> = {
  reception: ReceptionPage,
}

export function AppShell() {
  const { ui } = useClinicState()
  const Screen = SCREENS[ui.activeRoute]
  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      <Sidebar />
      <main className="min-w-0 flex-1">{Screen ? <Screen /> : <PlaceholderPage key={ui.activeRoute} route={ui.activeRoute} />}</main>
    </div>
  )
}
