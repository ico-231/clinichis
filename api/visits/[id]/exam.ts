import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../server/http'
import { examService } from '../../../server/exam'

/** PUT /api/visits/:id/exam — lưu sinh hiệu, lý do, hỏi bệnh, chẩn đoán, đơn thuốc, hẹn tái khám (tự chuyển Đang khám) */
export function PUT(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).saveExam(segmentFromEnd(request, 1), await readJson(request))))
}
