import { getRepos, handle, json } from '../../http.js'
import { examService } from '../../exam.js'

/** GET /api/orders?dateFrom=&dateTo=&category=imaging|lab&performStatus=&providerId= — danh sách việc của phòng CLS */
export function GET(request: Request) {
  return handle(request, async () => {
    const sp = new URL(request.url).searchParams
    const get = (k: string) => sp.get(k) ?? undefined
    return json(await examService(getRepos()).listOrders({ dateFrom: get('dateFrom'), dateTo: get('dateTo'), category: get('category'), performStatus: get('performStatus'), providerId: get('providerId') }))
  })
}
