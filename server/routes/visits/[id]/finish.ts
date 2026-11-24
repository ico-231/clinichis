import { getRepos, handle, json, readJson, segmentFromEnd } from '../../../http.js'
import { examService } from '../../../exam.js'

/** POST /api/visits/:id/finish — hoàn thành khám { confirmNoDiagnosis? } */
export function POST(request: Request) {
  return handle(request, async () => json(await examService(getRepos()).finish(segmentFromEnd(request, 1), await readJson(request))))
}
