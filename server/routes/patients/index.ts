import { getRepos, handle, json, readJson } from '../../http.js'
import { patientService } from '../../patients.js'

/** GET /api/patients?q=&limit=&offset= — danh sách / tìm kiếm */
export function GET(request: Request) {
  return handle(request, async () => {
    const sp = new URL(request.url).searchParams
    const result = await patientService(getRepos()).list({
      q: sp.get('q') ?? undefined,
      limit: sp.has('limit') ? Number(sp.get('limit')) : undefined,
      offset: sp.has('offset') ? Number(sp.get('offset')) : undefined,
    })
    return json(result)
  })
}

/** POST /api/patients — tạo hồ sơ, máy chủ cấp mã BN */
export function POST(request: Request) {
  return handle(request, async () => json(await patientService(getRepos()).create(await readJson(request)), 201))
}
