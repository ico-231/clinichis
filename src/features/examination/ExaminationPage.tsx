import { useClinicState } from '@/store/ClinicStore'
import { ExamListPage } from './ExamListPage'
import { ExamWorkspace } from './ExamWorkspace'

/** Route "Khám bệnh": danh sách Lịch khám hoặc màn khám của một lượt */
export function ExaminationPage() {
  const { ui, visits } = useClinicState()
  const visitId = ui.examVisitId && visits.some((v) => v.id === ui.examVisitId) ? ui.examVisitId : null
  return visitId ? <ExamWorkspace visitId={visitId} /> : <ExamListPage />
}
