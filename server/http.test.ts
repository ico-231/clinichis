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
