import { getRepos, handle, json, segmentFromEnd } from '../../../../http.js'
import { examService } from '../../../../exam.js'

/** POST /api/visits/:id/prescription/send — gửi đơn thuốc cho người bệnh (mô phỏng) */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).sendPrescription(segmentFromEnd(request, 2))))
}
