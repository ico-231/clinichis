import { getRepos, handle, json, lastSegment } from '../../http.js'
import { visitService } from '../../visits.js'

/** GET /api/visits/:id */
export function GET(request: Request) {
  return handle(request, async () => json(await visitService(getRepos()).get(lastSegment(request))))
}
