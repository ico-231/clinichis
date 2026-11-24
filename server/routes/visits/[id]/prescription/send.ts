import { getRepos, handle, json, segmentFromEnd } from '../../../../http'
import { examService } from '../../../../exam'

/** POST /api/visits/:id/prescription/send — gửi đơn thuốc cho người bệnh (mô phỏng) */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).sendPrescription(segmentFromEnd(request, 2))))
}
