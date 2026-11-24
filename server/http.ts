import { ApiError } from './errors'
import { createMemoryRepos } from './memoryRepo'
import type { Repos } from './repo'
import { createSupabaseRepos } from './supabaseRepo'

export function json(data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/** Bọc một handler: lỗi nghiệp vụ → JSON có mã HTTP; lỗi lạ → 500 (không lộ chi tiết ra ngoài) */
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } }, err.status)
    console.error(err)
    return json({ error: { code: 'server_error', message: 'Lỗi máy chủ' } }, 500)
  }
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
