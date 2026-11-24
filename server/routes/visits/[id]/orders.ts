import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../http'
import { examService } from '../../../exam'

/** PUT /api/visits/:id/orders — thay danh sách chỉ định CLS { orders: [{ serviceId, quantity?, instruction? }] } */
export function PUT(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).setOrders(segmentFromEnd(request, 1), await readJson(request))))
}
