import { getRepos, handle, json, segmentFromEnd } from '../../../../server/http'
import { examService } from '../../../../server/exam'

/** POST /api/visits/:id/orders/send — gửi các chỉ định chưa gửi tới nơi thực hiện */
export function POST(request: Request) {
  return handle(async () => json(await examService(getRepos()).sendOrders(segmentFromEnd(request, 2))))
}
