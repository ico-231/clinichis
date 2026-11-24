import { getRepos, handle, json, lastSegment, readJson } from '../../http'
import { catalogService } from '../../catalog'

/** GET /api/settings/:key — clinic_profile | system | schedules | default_provider_id (chưa lưu thì trả mặc định của 1.0) */
export function GET(request: Request) {
  return handle(request, async () => json(await catalogService(getRepos()).getSetting(lastSegment(request))))
}

/** PUT /api/settings/:key — { data } */
export function PUT(request: Request) {
  return handle(request, async () => json(await catalogService(getRepos()).setSetting(lastSegment(request), await readJson(request))))
}
