import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../http.js'
import { visitService } from '../../../visits.js'

/** POST /api/visits/:id/status { status } — chỉ sang bước kế tiếp: registered→waiting→in_progress→done */
export function POST(request: Request) {
  return handle(request, async () => json(await visitService(getRepos()).setStatus(segmentFromEnd(request, 1), await readJson(request))))
}
