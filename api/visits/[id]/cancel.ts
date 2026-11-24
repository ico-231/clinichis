import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../server/http'
import { visitService } from '../../../server/visits'

/** POST /api/visits/:id/cancel { reason, refund?, refundMethod? } */
export function POST(request: Request) {
  return handle(async () => json(await visitService(getRepos()).cancel(segmentFromEnd(request, 1), await readJson(request))))
}
