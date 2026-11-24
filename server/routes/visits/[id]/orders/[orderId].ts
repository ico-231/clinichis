import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../../http'
import { examService } from '../../../../exam'

/** PATCH /api/visits/:id/orders/:orderId — phòng CLS cập nhật { performStatus?, result? } */
export function PATCH(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).updateOrder(segmentFromEnd(request, 2), segmentFromEnd(request, 0), await readJson(request))))
}
