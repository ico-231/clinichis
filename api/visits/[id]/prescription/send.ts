import { getRepos, handle, json, segmentFromEnd } from '../../../../server/http'
import { examService } from '../../../../server/exam'

/** POST /api/visits/:id/prescription/send — gửi đơn thuốc cho người bệnh (mô phỏng) */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).sendPrescription(segmentFromEnd(request, 2))))
}
