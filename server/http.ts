import { ApiError } from './errors.js'
import { createMemoryRepos } from './memoryRepo.js'
import type { Repos } from './repo.js'
import { createSupabaseRepos } from './supabaseRepo.js'

export function json(data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/** Số lần gọi tối đa mỗi phút cho một địa chỉ IP (chỉ trong một máy chủ; đủ để chặn gọi dồn trong bản demo) */
const RATE_LIMIT = 120
const hits = new Map<string, { at: number; count: number }>()

/**
 * Chặn trước khi chạy handler:
 * - CLINIC_API_KEY đặt trên máy chủ ⇒ mọi request phải gửi header `x-clinic-key` trùng khớp (401 nếu sai).
 *   Đây là khoá dùng chung cho bản demo, KHÔNG thay được đăng nhập: khoá nằm trong frontend thì ai mở mã nguồn cũng thấy.
 * - Giới hạn số lần gọi theo IP (429).
 */
export function guard(request: Request, env: Record<string, string | undefined> = process.env, now = Date.now()) {
  const expected = env.CLINIC_API_KEY
  if (expected && request.headers.get('x-clinic-key') !== expected) throw new ApiError('unauthorized', 'Thiếu hoặc sai mã truy cập API')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local'
  const h = hits.get(ip)
  if (!h || now - h.at >= 60_000) hits.set(ip, { at: now, count: 1 })
  else if (++h.count > Number(env.CLINIC_RATE_LIMIT ?? RATE_LIMIT)) throw new ApiError('rate_limited', 'Gọi API quá nhiều, vui lòng thử lại sau một phút')
}

/** Bọc một handler: kiểm tra mã truy cập + giới hạn; lỗi nghiệp vụ → JSON có mã HTTP; lỗi lạ → 500 (không lộ chi tiết) */
export async function handle(request: Request, fn: () => Promise<Response>) {
  try {
    guard(request)
    return await fn()
  } catch (err) {
    if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } }, err.status)
    console.error(err)
    return json({ error: { code: 'server_error', message: 'Lỗi máy chủ' } }, 500)
  }
}

/** Chỉ dùng trong test */
export function resetRateLimitForTest() {
  hits.clear()
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('bad_request', 'Nội dung gửi lên không phải JSON hợp lệ')
  }
}

/** Phần cuối của đường dẫn, vd. /api/patients/p_123 → p_123 */
export const lastSegment = (request: Request) => segmentFromEnd(request, 0)

/** Đoạn thứ n tính từ cuối đường dẫn, vd. /api/visits/v_1/status, n=1 → v_1 */
export function segmentFromEnd(request: Request, n: number) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1 - n] ?? '')
}

let cached: Repos | null = null
/** Chọn kho dữ liệu theo biến môi trường; giữ lại giữa các lần gọi trong cùng một tiến trình */
export function getRepos(env: Record<string, string | undefined> = process.env): Repos {
  if (cached) return cached
  if (env.CLINIC_DATA === 'memory') return (cached = createMemoryRepos())
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError('server_error', 'Chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return (cached = createSupabaseRepos(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY))
}

/** Chỉ dùng trong test */
export function setReposForTest(repos: Repos | null) {
  cached = repos
}
