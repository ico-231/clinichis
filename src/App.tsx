import { ClinicProvider } from '@/store/ClinicStore'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'

export default function App() {
  return (
    <ClinicProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </ClinicProvider>
  )
}
