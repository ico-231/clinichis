import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../server/http'
import { examService } from '../../../server/exam'

/** POST /api/visits/:id/finish — hoàn thành khám { confirmNoDiagnosis? } */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).finish(segmentFromEnd(request, 1), await readJson(request))))
}
