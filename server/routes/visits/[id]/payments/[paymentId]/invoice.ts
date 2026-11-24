import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../../../http'
import { paymentService } from '../../../../../payments'

/** PUT /api/visits/:id/payments/:paymentId/invoice — thông tin / trạng thái hoá đơn điện tử của phiếu thu */
export function PUT(request: Request) {
  return handle(request, async () => json(await paymentService(getRepos()).setInvoice(segmentFromEnd(request, 3), segmentFromEnd(request, 1), await readJson(request))))
}
