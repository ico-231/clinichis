import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../http'
import { visitService } from '../../../visits'

/** POST /api/visits/:id/cancel { reason, refund?, refundMethod? } */
export function POST(request: Request) {
  return handle(request, async () => json(await visitService(getRepos()).cancel(segmentFromEnd(request, 1), await readJson(request))))
}
