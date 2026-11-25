import { json } from './http.js'
import * as adminResetDemo from './routes/admin/reset-demo.js'
import * as adminSeed from './routes/admin/seed.js'
import * as catalogKind from './routes/catalog/[kind].js'
import * as orders from './routes/orders/index.js'
import * as patientOne from './routes/patients/[id].js'
import * as patients from './routes/patients/index.js'
import * as reportSummary from './routes/reports/summary.js'
import * as settingKey from './routes/settings/[key].js'
import * as visitOne from './routes/visits/[id].js'
import * as visitCancel from './routes/visits/[id]/cancel.js'
import * as visitExam from './routes/visits/[id]/exam.js'
import * as visitFinish from './routes/visits/[id]/finish.js'
import * as visitOrders from './routes/visits/[id]/orders.js'
import * as visitOrderOne from './routes/visits/[id]/orders/[orderId].js'
import * as visitOrdersSend from './routes/visits/[id]/orders/send.js'
import * as visitPayments from './routes/visits/[id]/payments.js'
import * as visitInvoice from './routes/visits/[id]/payments/[paymentId]/invoice.js'
import * as visitPrescriptionSend from './routes/visits/[id]/prescription/send.js'
import * as visitStatus from './routes/visits/[id]/status.js'
import * as visits from './routes/visits/index.js'

type Handler = (request: Request) => Response | Promise<Response>
type RouteModule = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', Handler>>

/**
 * Bảng định tuyến: mẫu đường dẫn sau `/api/` → module handler. `:x` khớp một đoạn bất kỳ.
 * Gói Hobby của Vercel chỉ cho 12 hàm/triển khai nên mọi route đi qua một hàm duy nhất (`api/router.ts`).
 * Mẫu chữ cố định đứng trước mẫu tham số cùng vị trí (vd. `orders/send` trước `orders/:orderId`).
 */
const ROUTES: [string, RouteModule][] = [
  ['patients', patients],
  ['patients/:id', patientOne],
  ['visits', visits],
  ['visits/:id', visitOne],
  ['visits/:id/status', visitStatus],
  ['visits/:id/cancel', visitCancel],
  ['visits/:id/exam', visitExam],
  ['visits/:id/finish', visitFinish],
  ['visits/:id/orders', visitOrders],
  ['visits/:id/orders/send', visitOrdersSend],
  ['visits/:id/orders/:orderId', visitOrderOne],
  ['visits/:id/prescription/send', visitPrescriptionSend],
  ['visits/:id/payments', visitPayments],
  ['visits/:id/payments/:paymentId/invoice', visitInvoice],
  ['orders', orders],
  ['catalog/:kind', catalogKind],
  ['settings/:key', settingKey],
  ['reports/summary', reportSummary],
  ['admin/seed', adminSeed],
  ['admin/reset-demo', adminResetDemo],
]

export function matchRoute(path: string): RouteModule | null {
  const parts = path.split('/').filter(Boolean)
  for (const [pattern, mod] of ROUTES) {
    const p = pattern.split('/')
    if (p.length === parts.length && p.every((seg, i) => seg.startsWith(':') || seg === parts[i])) return mod
  }
  return null
}

/**
 * Nhận request đã được vercel.json viết lại thành `/api/router?__path=<đường dẫn gốc>`
 * (hoặc gọi thẳng `/api/<đường dẫn>` khi test), dựng lại URL gốc rồi giao cho handler.
 */
export async function route(request: Request): Promise<Response> {
  const url = new URL(request.url)
  let path = url.searchParams.get('__path')
  url.searchParams.delete('__path')
  if (path === null) path = url.pathname.replace(/^\/api\/?/, '')
  path = path.replace(/^\/+|\/+$/g, '')
  url.pathname = `/api/${path}`
  const mod = matchRoute(path)
  if (!mod) return json({ error: { code: 'not_found', message: 'Không có API này' } }, 404)
  const handler = mod[request.method as keyof RouteModule]
  if (!handler) return json({ error: { code: 'method_not_allowed', message: 'Phương thức không được hỗ trợ' } }, 405)
  const init: RequestInit = { method: request.method, headers: request.headers }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }
  return handler(new Request(url, init))
}
