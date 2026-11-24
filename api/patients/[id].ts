import { getRepos, handle, json, lastSegment, readJson } from '../../server/http'
import { patientService } from '../../server/patients'

/** GET /api/patients/:id */
export function GET(request: Request) {
  return handle(request, async () => json(await patientService(getRepos()).get(lastSegment(request))))
}

/** PATCH /api/patients/:id — sửa một phần hồ sơ */
export function PATCH(request: Request) {
  return handle(request, async () => json(await patientService(getRepos()).update(lastSegment(request), await readJson(request))))
}

/** DELETE /api/patients/:id — bị chặn (409) nếu đã khám / đã thu tiền */
export function DELETE(request: Request) {
  return handle(request, async () => {
    await patientService(getRepos()).remove(lastSegment(request))
    return json(null, 204)
  })
}
