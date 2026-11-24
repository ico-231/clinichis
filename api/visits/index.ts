import { getRepos, handle, json, readJson } from '../../server/http'
import { visitService } from '../../server/visits'

/** GET /api/visits?dateFrom=&dateTo=&status=&paymentStatus=&patientId=&q= — mặc định hôm nay (giờ VN) */
export function GET(request: Request) {
  return handle(request, async () => {
    const sp = new URL(request.url).searchParams
    const get = (k: string) => sp.get(k) ?? undefined
    return json(await visitService(getRepos()).list({ dateFrom: get('dateFrom'), dateTo: get('dateTo'), status: get('status'), paymentStatus: get('paymentStatus'), patientId: get('patientId'), q: get('q') }))
  })
}

/** POST /api/visits — đăng ký lượt khám: { patientId, visit, patientPatch? } hoặc { patient, visit } */
export function POST(request: Request) {
  return handle(request, async () => json(await visitService(getRepos()).register(await readJson(request)), 201))
}
