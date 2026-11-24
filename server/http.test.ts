import { afterEach, describe, expect, it } from 'vitest'
import { guard, handle, json, resetRateLimitForTest } from './http'

const req = (headers: Record<string, string> = {}) => new Request('http://x/api/patients', { headers })

describe('guard — mã truy cập và giới hạn số lần gọi', () => {
  afterEach(() => resetRateLimitForTest())

  it('không đặt CLINIC_API_KEY thì cho qua; đặt rồi thì phải gửi đúng x-clinic-key', () => {
    expect(() => guard(req(), {})).not.toThrow()
    expect(() => guard(req(), { CLINIC_API_KEY: 'demo-123' })).toThrow(expect.objectContaining({ status: 401 }))
    expect(() => guard(req({ 'x-clinic-key': 'sai' }), { CLINIC_API_KEY: 'demo-123' })).toThrow(expect.objectContaining({ status: 401 }))
    expect(() => guard(req({ 'x-clinic-key': 'demo-123' }), { CLINIC_API_KEY: 'demo-123' })).not.toThrow()
  })

  it('quá số lần gọi trong một phút theo IP → 429; sang phút sau gọi lại được; IP khác không ảnh hưởng', () => {
    const env = { CLINIC_RATE_LIMIT: '3' }
    const a = req({ 'x-forwarded-for': '1.2.3.4' })
    for (let i = 0; i < 3; i++) guard(a, env, 1_000)
    expect(() => guard(a, env, 2_000)).toThrow(expect.objectContaining({ status: 429 }))
    expect(() => guard(req({ 'x-forwarded-for': '5.6.7.8' }), env, 2_000)).not.toThrow()
    expect(() => guard(a, env, 61_001)).not.toThrow()
  })

  it('handle trả lỗi JSON khi bị chặn, không chạy handler', async () => {
    process.env.CLINIC_API_KEY = 'k'
    let ran = false
    const res = await handle(req(), async () => ((ran = true), json({ ok: true })))
    delete process.env.CLINIC_API_KEY
    expect(res.status).toBe(401)
    expect(ran).toBe(false)
    expect(await res.json()).toMatchObject({ error: { code: 'unauthorized' } })
  })
})

describe('POST /api/admin/seed', () => {
  it('ẩn (404) khi chưa bật ALLOW_SEED hoặc chưa đặt CLINIC_API_KEY', async () => {
    const { POST } = await import('./routes/admin/seed')
    delete process.env.ALLOW_SEED
    expect((await POST(new Request('http://x/api/admin/seed', { method: 'POST' }))).status).toBe(404)
    process.env.ALLOW_SEED = 'yes'
    expect((await POST(new Request('http://x/api/admin/seed', { method: 'POST' }))).status).toBe(404)
    delete process.env.ALLOW_SEED
  })
})

describe('router — một hàm cho mọi /api/*', () => {
  it('khớp route, giữ query gốc, 404 khi không có API, 405 khi sai phương thức', async () => {
    const { matchRoute, route } = await import('./router')
    const { setReposForTest } = await import('./http')
    const { createMemoryRepos } = await import('./memoryRepo')
    expect(matchRoute('visits/v1/orders/send')).toBe(await import('./routes/visits/[id]/orders/send'))
    expect(matchRoute('visits/v1/orders/o1')).toBe(await import('./routes/visits/[id]/orders/[orderId]'))
    expect(matchRoute('visits/v1/khong-co')).toBeNull()
    setReposForTest(createMemoryRepos())
    const viaRewrite = await route(new Request('http://x/api/router?__path=patients&q=abc&limit=5'))
    expect(viaRewrite.status).toBe(200)
    expect(await viaRewrite.json()).toMatchObject({ items: [] })
    const created = await route(new Request('http://x/api/router?__path=patients', { method: 'POST', body: JSON.stringify({ fullName: 'Ngô Thị Lan', dob: '1990-01-01', gender: 'female', phone: '0912000000' }) }))
    expect(created.status).toBe(201)
    const id = ((await created.json()) as { id: string }).id
    expect((await route(new Request(`http://x/api/patients/${id}`))).status).toBe(200)
    expect((await route(new Request('http://x/api/router?__path=khong-co'))).status).toBe(404)
    expect((await route(new Request('http://x/api/router?__path=reports/summary', { method: 'DELETE' }))).status).toBe(405)
    setReposForTest(null)
  }, 20000) // lần đầu import cả bảng route có thể chậm khi chạy song song
})

describe('supabaseAuthHeaders', () => {
  it('khoá mới sb_secret chỉ gửi apikey; khoá JWT cũ gửi thêm Bearer', async () => {
    const { supabaseAuthHeaders } = await import('./supabaseRepo')
    expect(supabaseAuthHeaders('sb_secret_abc')).toEqual({ apikey: 'sb_secret_abc' })
    expect(supabaseAuthHeaders('eyJhbGc')).toEqual({ apikey: 'eyJhbGc', Authorization: 'Bearer eyJhbGc' })
  })
})

describe('seedSupabase', () => {
  it('ghi theo lô, khai báo đủ cột, cột thiếu lấy mặc định, khoá sb_ chỉ qua apikey', async () => {
    const { seedSupabase } = await import('./seed')
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response('', { status: 201 })
    }) as unknown as typeof fetch
    const r = await seedSupabase('https://demo.supabase.co/', 'sb_secret_x', fake)
    expect(r.patients).toBeGreaterThan(0)
    const first = calls[0]
    expect(first.url).toMatch(/^https:\/\/demo\.supabase\.co\/rest\/v1\/patients\?on_conflict=id&columns=.*full_name/)
    expect(first.init.headers).toMatchObject({ apikey: 'sb_secret_x', Prefer: 'resolution=merge-duplicates,missing=default' })
    expect(first.init.headers).not.toHaveProperty('Authorization')
    expect(calls.some((c) => c.url.includes('/rest/v1/visits?'))).toBe(true)
  }, 20000)
})
