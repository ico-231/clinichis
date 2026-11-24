import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../server/http'
import { examService } from '../../../server/exam'

/** PUT /api/visits/:id/orders — thay danh sách chỉ định CLS { orders: [{ serviceId, quantity?, instruction? }] } */
export function PUT(request: Request) {
  return handle(async () => json(await examService(getRepos()).setOrders(segmentFromEnd(request, 1), await readJson(request))))
}
