import { afterEach, describe, expect, it } from 'vitest'
import type { Patient, Visit } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { patientService } from './patients'
import { setReposForTest } from './http'
import { createSupabaseRepos } from './supabaseRepo'
import * as collection from './routes/patients/index'
import * as item from './routes/patients/[id]'
import { todayVN } from './time'

const adult = { fullName: 'Nguyễn Văn An', dob: '1990-05-12', gender: 'male', phone: '0912 345 678', address: 'Hà Nội' }

const existing: Patient = {
  id: 'p_old', code: 'BN000041', fullName: 'Trần Thị Bình', dob: '1985-01-02', gender: 'female', phone: '0987000111',
  address: 'Huế', createdAt: '2026-11-01T02:00:00.000Z',
}
const visit = (patch: Partial<Visit>): Visit => ({
  id: 'v1', code: 'YMD202611240000001', patientId: 'p_old', queueNumber: 1, date: '2026-11-24', time: '08:00', doctorId: 'd1', roomId: 'r1',
  serviceId: 's1', fee: 100000, payments: [], paymentStatus: 'unpaid', status: 'registered', patientType: 'returning', category: 'walk_in',
  source: 'direct', reason: 'Sốt', note: '', createdAt: '2026-11-24T01:00:00.000Z', ...patch,
})

describe('patientService', () => {
  it('tạo hồ sơ: cấp mã BN tiếp theo, chuẩn hoá SĐT và khoảng trắng tên', async () => {
    const svc = patientService(createMemoryRepos({ patients: [existing] }))
    const p = await svc.create({ ...adult, fullName: '  Nguyễn   Văn  An ', code: 'BN999999', id: 'hack' })
    expect(p.code).toBe('BN000042')
    expect(p.id).not.toBe('hack')
    expect(p.fullName).toBe('Nguyễn Văn An')
    expect(p.phone).toBe('0912345678')
  })

  it('kiểm tra dữ liệu như form 1.0: tên, ngày sinh, SĐT, người giám hộ trẻ dưới 16 tuổi', async () => {
    const svc = patientService(createMemoryRepos())
    await expect(svc.create({ ...adult, fullName: 'An', phone: '12345' })).rejects.toMatchObject({ status: 422, fields: { fullName: expect.any(String), phone: expect.any(String) } })
    await expect(svc.create({ ...adult, dob: '2999-01-01' })).rejects.toMatchObject({ fields: { dob: 'Ngày sinh không hợp lệ' } })
    const child = { ...adult, dob: `${Number(todayVN().slice(0, 4)) - 5}-01-01` }
    await expect(svc.create(child)).rejects.toMatchObject({ fields: { guardianName: expect.any(String) } })
    await expect(svc.create({ ...child, guardianName: 'Nguyễn Thị Mẹ', guardianRelation: 'mother' })).resolves.toMatchObject({ code: 'BN000001' })
  })

  it('sửa hồ sơ: kiểm tra trên bản ghi sau khi sửa, không đổi được mã BN', async () => {
    const svc = patientService(createMemoryRepos({ patients: [existing] }))
    const p = await svc.update('p_old', { address: 'Đà Nẵng', code: 'BN000001' })
    expect(p).toMatchObject({ address: 'Đà Nẵng', code: 'BN000041' })
    await expect(svc.update('p_old', { phone: 'abc' })).rejects.toMatchObject({ status: 422 })
    await expect(svc.update('nope', { address: 'x' })).rejects.toMatchObject({ status: 404 })
  })

  it('tìm theo tên không dấu, mã BN, SĐT; có phân trang', async () => {
    const svc = patientService(createMemoryRepos({ patients: [existing] }))
    await svc.create(adult)
    expect((await svc.list({ q: 'nguyen van' })).items.map((p) => p.fullName)).toEqual(['Nguyễn Văn An'])
    expect((await svc.list({ q: 'BN000041' })).total).toBe(1)
    expect((await svc.list({ q: '0987' })).items[0].id).toBe('p_old')
    const page = await svc.list({ limit: 1, offset: 1 })
    expect(page).toMatchObject({ total: 2 })
    expect(page.items).toHaveLength(1)
  })

  it('xoá: chặn khi đã khám hoặc đã thu tiền (dùng chung quy tắc patientDeleteBlock của 1.0)', async () => {
    const paid = visit({ payments: [{ id: 'pay1', kind: 'payment', amount: 100000, method: 'cash', at: '2026-11-24T01:00:00.000Z' }] })
    const svc = patientService(createMemoryRepos({ patients: [existing], visits: [paid] }))
    await expect(svc.remove('p_old')).rejects.toMatchObject({ status: 409 })

    const repos = createMemoryRepos({ patients: [existing], visits: [visit({ status: 'cancelled' })] })
    await patientService(repos).remove('p_old')
    expect(await repos.patients.get('p_old')).toBeNull()
    expect(await repos.visits.listByPatient('p_old')).toEqual([])
  })
})

describe('API /api/patients', () => {
  afterEach(() => setReposForTest(null))

  it('POST rồi GET, PATCH, DELETE; lỗi trả JSON có mã', async () => {
    setReposForTest(createMemoryRepos())
    const created = await collection.POST(new Request('http://x/api/patients', { method: 'POST', body: JSON.stringify(adult) }))
    expect(created.status).toBe(201)
    const p = (await created.json()) as Patient

    const list = await collection.GET(new Request('http://x/api/patients?q=an&limit=5'))
    expect(((await list.json()) as { total: number }).total).toBe(1)

    const got = await item.GET(new Request(`http://x/api/patients/${p.id}`))
    expect(((await got.json()) as Patient).code).toBe('BN000001')

    const patched = await item.PATCH(new Request(`http://x/api/patients/${p.id}`, { method: 'PATCH', body: JSON.stringify({ allergies: 'Penicillin' }) }))
    expect(((await patched.json()) as Patient).allergies).toBe('Penicillin')

    expect((await item.DELETE(new Request(`http://x/api/patients/${p.id}`, { method: 'DELETE' }))).status).toBe(204)
    const missing = await item.GET(new Request(`http://x/api/patients/${p.id}`))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'not_found' } })

    const bad = await collection.POST(new Request('http://x/api/patients', { method: 'POST', body: '{không phải json' }))
    expect(bad.status).toBe(400)
  })
})

describe('createSupabaseRepos (giả lập fetch)', () => {
  it('gọi đúng REST của Supabase, đổi snake_case ↔ camelCase, gửi cột tìm kiếm không dấu', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('/rpc/create_patient')) {
        const { payload } = JSON.parse(String(init.body))
        return new Response(JSON.stringify({ ...payload, id: 'p_1', code: 'BN000001', created_at: 'now', search_key: payload.search_key, email: null }), { status: 200 })
      }
      return new Response(JSON.stringify([{ id: 'p_1', code: 'BN000001', full_name: 'Nguyễn Văn An', search_key: 'nguyen van an' }]), {
        status: 200,
        headers: { 'content-range': '0-0/7' },
      })
    }) as unknown as typeof fetch
    const repos = createSupabaseRepos('https://demo.supabase.co/', 'service-key', fakeFetch)

    const p = await repos.patients.create({ fullName: 'Nguyễn Văn An', dob: '1990-05-12', gender: 'male', phone: '0912345678', address: '', guardianName: undefined })
    expect(calls[0].url).toBe('https://demo.supabase.co/rest/v1/rpc/create_patient')
    expect(JSON.parse(String(calls[0].init.body)).payload).toMatchObject({ full_name: 'Nguyễn Văn An', search_key: 'nguyen van an' })
    expect((calls[0].init.headers as Record<string, string>).apikey).toBe('service-key')
    expect(p).toMatchObject({ fullName: 'Nguyễn Văn An', createdAt: 'now' })
    expect(p).not.toHaveProperty('searchKey')
    expect(p).not.toHaveProperty('email')

    const list = await repos.patients.list({ q: 'Nguyễn', limit: 20, offset: 0 })
    expect(list.total).toBe(7)
    expect(decodeURIComponent(calls[1].url)).toContain('search_key.ilike.*nguyen*')
  })

  it('lỗi trùng khoá → 409, lỗi khác → 500', async () => {
    const repos = createSupabaseRepos('https://demo.supabase.co', 'k', (async () => new Response('{"code":"23505"}', { status: 409 })) as unknown as typeof fetch)
    await expect(repos.patients.get('x')).rejects.toMatchObject({ status: 409 })
    const repos2 = createSupabaseRepos('https://demo.supabase.co', 'k', (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch)
    await expect(repos2.patients.get('x')).rejects.toMatchObject({ status: 500 })
  })
})
