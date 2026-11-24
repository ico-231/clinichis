import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../server/http'
import { paymentService } from '../../../server/payments'

/** GET /api/visits/:id/payments — các dòng cần thu, đã thu, còn lại, danh sách phiếu */
export function GET(request: Request) {
  return handle(async () => json(await paymentService(getRepos()).summary(segmentFromEnd(request, 1))))
}

/** POST /api/visits/:id/payments — thu tiền theo dòng: { items: [{ kind, refId, discount? }], discount?, customerPaid?, method, invoice?, note? } */
export function POST(request: Request) {
  return handle(async () => json(await paymentService(getRepos()).checkout(segmentFromEnd(request, 1), await readJson(request)), 201))
}
