import { describe, expect, it } from 'vitest'
import { ApiClientError, createApiClient } from './client'

describe('createApiClient', () => {
  it('gọi đúng đường dẫn, gửi mã truy cập, đọc lỗi JSON của backend', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.endsWith('/api/visits/v%201/status')) return new Response(JSON.stringify({ error: { code: 'conflict', message: 'Không thể chuyển', fields: { status: 'x' } } }), { status: 409 })
      if (init.method === 'DELETE') return new Response(null, { status: 204 })
      return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    }) as unknown as typeof fetch
    const api = createApiClient({ baseUrl: 'https://demo.vercel.app/', apiKey: 'k1', fetchImpl: fake })

    expect(await api.visits.list({ dateFrom: '2026-11-24', q: '', status: 'waiting' })).toEqual({ items: [], total: 0 })
    expect(calls[0].url).toBe('https://demo.vercel.app/api/visits?dateFrom=2026-11-24&status=waiting')
    expect((calls[0].init.headers as Record<string, string>)['x-clinic-key']).toBe('k1')

    await expect(api.visits.setStatus('v 1', 'done')).rejects.toMatchObject({ status: 409, code: 'conflict', fields: { status: 'x' } })
    await expect(api.visits.setStatus('v 1', 'done')).rejects.toBeInstanceOf(ApiClientError)
    expect(await api.patients.remove('p1')).toBeUndefined()
  })
})
