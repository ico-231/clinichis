import { useEffect, useRef } from 'react'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { ExamListPage } from './ExamListPage'
import { ExamWorkspace } from './ExamWorkspace'

/** Route "Khám bệnh": danh sách Lịch khám hoặc màn khám của một lượt */
export function ExaminationPage() {
  const { ui, visits } = useClinicState()
  const { setUI } = useClinicActions()
  const visitId = ui.examVisitId && visits.some((v) => v.id === ui.examVisitId) ? ui.examVisitId : null
  const inWorkspace = Boolean(visitId)
  const prevCollapsed = useRef<boolean | null>(null)

  // Màn khám cần rộng: thu gọn Sidebar khi vào, khôi phục khi ra
  useEffect(() => {
    if (!inWorkspace) return
    prevCollapsed.current = ui.sidebarCollapsed
    if (!ui.sidebarCollapsed) setUI({ sidebarCollapsed: true })
    return () => {
      if (prevCollapsed.current === false) setUI({ sidebarCollapsed: false })
      prevCollapsed.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inWorkspace])

  return visitId ? <ExamWorkspace visitId={visitId} /> : <ExamListPage />
}
