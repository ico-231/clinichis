import { getRepos, handle, json, lastSegment, readJson } from '../../http'
import { catalogService } from '../../catalog'

/** GET /api/catalog/:kind — services | cls_services | paraclinical_combos | prescription_templates | result_templates | drugs | providers | doctors | rooms | external_cls */
export function GET(request: Request) {
  return handle(request, async () => json(await catalogService(getRepos()).list(lastSegment(request))))
}

/** PUT /api/catalog/:kind — thay toàn bộ danh mục sửa được: { items: [...] } */
export function PUT(request: Request) {
  return handle(request, async () => json(await catalogService(getRepos()).replace(lastSegment(request), await readJson(request))))
}
