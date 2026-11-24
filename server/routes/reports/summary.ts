import { getRepos, handle, json } from '../../http.js'
import { reportService } from '../../reports.js'

/** GET /api/reports/summary?dateFrom=&dateTo= — tổng hợp kỳ báo cáo (mặc định hôm nay, giờ VN) */
export function GET(request: Request) {
  return handle(request, async () => {
    const sp = new URL(request.url).searchParams
    return json(await reportService(getRepos()).summary({ dateFrom: sp.get('dateFrom') ?? undefined, dateTo: sp.get('dateTo') ?? undefined }))
  })
}
