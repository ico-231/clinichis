import { getRepos, handle, json, segmentFromEnd } from '../../../../http.js'
import { examService } from '../../../../exam.js'

/** POST /api/visits/:id/orders/send — gửi các chỉ định chưa gửi tới nơi thực hiện */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).sendOrders(segmentFromEnd(request, 2))))
}
