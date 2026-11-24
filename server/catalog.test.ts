import { afterEach, describe, expect, it } from 'vitest'
import type { Patient } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { catalogService } from './catalog'
import { examService } from './exam'
import { visitService } from './visits'
import { paymentService } from './payments'
import { reportService } from './reports'
import { setReposForTest } from './http'
import { createSupabaseRepos } from './supabaseRepo'
import * as catalogApi from './routes/catalog/[kind]'
import * as settingsApi from './routes/settings/[key]'
import * as reportApi from './routes/reports/summary'

const clock = () => new Date('2026-11-24T02:00:00.000Z')
const patient: Patient = { id: 'p1', code: 'BN000001', fullName: 'Lê Minh Đức', dob: '2019-08-12', gender: 'male', phone: '0707400979', address: '', guardianName: 'Lê Văn Bố', createdAt: 'x' }
const visitBody = (patch: Record<string, unknown> = {}) => ({
  date: '2026-11-24', time: '09:00', serviceId: 's1', fee: 150000, doctorId: 'd1', roomId: 'r1', category: 'walk_in', source: 'direct', reason: 'Sốt', note: '',
  checkInNow: true, payNow: false, payMethod: 'cash', ...patch,
})

describe('catalogService', () => {
  it('chưa lưu thì trả danh mục mặc định của 1.0; lưu rồi thì trả bản đã lưu', async () => {
    const svc = catalogService(createMemoryRepos())
    const def = await svc.list('services')
    expect(def).toMatchObject({ source: 'default', editable: true })
    expect(def.items).toContainEqual({ id: 's1', name: 'Khám nhi tổng quát', price: 150000 })
    const saved = await svc.replace('services', { items: [{ id: 's1', name: 'Khám nhi', price: 180000 }] })
    expect(saved.source).toBe('saved')
    expect((await svc.list('services')).items).toEqual([{ id: 's1', name: 'Khám nhi', price: 180000 }])
    expect((await svc.list('drugs')).editable).toBe(false)
  })

  it('kiểm tra danh mục: id trùng/thiếu, giá, loại CLS; danh mục chỉ đọc; loại không có', async () => {
    const svc = catalogService(createMemoryRepos())
    await expect(svc.replace('services', { items: [{ id: 'a', name: 'A', price: -1 }, { id: 'a', name: 'B', price: 0 }, { name: 'C' }] })).rejects.toMatchObject({
      status: 422, fields: { 'items.0': expect.any(String), 'items.1': 'Trùng id', 'items.2': 'Thiếu id' },
    })
    await expect(svc.replace('cls_services', { items: [{ id: 'x', name: 'X', price: 1, category: 'other', providerId: 'lab_internal' }] })).rejects.toMatchObject({ status: 422 })
    await expect(svc.replace('drugs', { items: [] })).rejects.toMatchObject({ status: 409 })
    await expect(svc.list('khong-co')).rejects.toMatchObject({ status: 404 })
  })

  it('cài đặt: mặc định của 1.0, lưu, kiểm tra nơi thực hiện CLS mặc định', async () => {
    const svc = catalogService(createMemoryRepos())
    expect(await svc.getSetting('default_provider_id')).toMatchObject({ source: 'default', data: 'lab_an_binh' })
    expect((await svc.getSetting('schedules')).data).toHaveProperty('fixed')
    await expect(svc.setSetting('default_provider_id', { data: 'khong-co' })).rejects.toMatchObject({ status: 422 })
    expect(await svc.setSetting('default_provider_id', { data: 'lab_internal' })).toMatchObject({ source: 'saved', data: 'lab_internal' })
    await expect(svc.getSetting('mat-khau')).rejects.toMatchObject({ status: 404 })
  })

  it('dịch vụ CLS nội bộ thêm ở danh mục chỉ định được ngay ở màn khám', async () => {
    const repos = createMemoryRepos({ patients: [patient] })
    await catalogService(repos).replace('cls_services', {
      items: [{ id: 'cls_new', providerId: 'lab_internal', name: 'Test nhanh RSV', groupLabel: 'VI SINH (lần)', category: 'lab', price: 180000 }],
    })
    const { visit } = await visitService(repos, { clock }).register({ patientId: 'p1', visit: visitBody() })
    const v = await examService(repos, { clock }).setOrders(visit.id, { orders: [{ serviceId: 'cls_new' }] })
    expect(v.paraclinicalOrders?.[0]).toMatchObject({ name: 'Test nhanh RSV', unitPrice: 180000, providerName: 'Lab nội bộ' })
  })
})

describe('reportService', () => {
  it('đếm lượt theo trạng thái, khách mới/cũ, doanh thu theo hình thức, hoàn tiền, còn phải thu, CLS nhiều nhất', async () => {
    const repos = createMemoryRepos({ patients: [patient] })
    const visits = visitService(repos, { clock })
    await visits.register({ patientId: 'p1', visit: visitBody({ payNow: true, payMethod: 'transfer' }) })
    const b = await visits.register({ patient: { fullName: 'Ngô Thị Lan', dob: '1990-01-01', gender: 'female', phone: '0912000000' }, visit: visitBody({ fee: 270000, consultationFee: 150000 }) })
    await examService(repos, { clock }).setOrders(b.visit.id, { orders: [{ serviceId: 'cls_m2' }] })
    await paymentService(repos, { clock }).checkout(b.visit.id, { items: [{ kind: 'consultation', refId: 'ck', discount: 10000 }], method: 'cash' })
    const c = await visits.register({ patientId: 'p1', visit: visitBody({ payNow: true }) })
    await visits.cancel(c.visit.id, { reason: 'Bỏ về', refund: true })

    const r = await reportService(repos, { clock }).summary({})
    expect(r.visits).toMatchObject({ total: 3, attended: 2, newPatients: 1, returningPatients: 1, byStatus: { waiting: 1, in_progress: 1, cancelled: 1 } })
    expect(r.revenue).toMatchObject({ collected: 150000 + 140000 + 150000, refunds: 150000, net: 290000, discount: 10000, receipts: 3, byMethod: { transfer: 150000, cash: 290000 } })
    expect(r.revenue.outstanding).toBe(210000)
    expect(r.byDay).toEqual([{ date: '2026-11-24', visits: 3, attended: 2, revenue: 290000 }])
    expect(r.topServices[0]).toMatchObject({ id: 's1', count: 2 })
    expect(r.topParaclinical[0]).toMatchObject({ serviceId: 'cls_m2', count: 1, amount: 210000 })

  })

  it('chặn khoảng ngày sai hoặc quá 1 năm', async () => {
    const svc = reportService(createMemoryRepos(), { clock })
    await expect(svc.summary({ dateFrom: '2026-11-25', dateTo: '2026-11-24' })).rejects.toMatchObject({ status: 422 })
    await expect(svc.summary({ dateFrom: '2024-01-01', dateTo: '2026-11-24' })).rejects.toMatchObject({ status: 422 })
  })
})

describe('API danh mục, cài đặt, báo cáo', () => {
  afterEach(() => setReposForTest(null))
  it('GET/PUT /api/catalog/:kind, /api/settings/:key, GET /api/reports/summary', async () => {
    setReposForTest(createMemoryRepos())
    const put = await catalogApi.PUT(new Request('http://x/api/catalog/result_templates', { method: 'PUT', body: JSON.stringify({ items: [{ id: 't1', name: 'Siêu âm bụng bình thường', description: '', conclusion: '' }] }) }))
    expect(put.status).toBe(200)
    expect(((await (await catalogApi.GET(new Request('http://x/api/catalog/result_templates'))).json()) as { items: unknown[] }).items).toHaveLength(1)
    const s = await settingsApi.PUT(new Request('http://x/api/settings/clinic_profile', { method: 'PUT', body: JSON.stringify({ data: { name: 'Phòng khám Nhi Khoa' } }) }))
    expect(((await s.json()) as { data: { name: string } }).data.name).toBe('Phòng khám Nhi Khoa')
    const r = await reportApi.GET(new Request('http://x/api/reports/summary?dateFrom=2026-11-01&dateTo=2026-11-24'))
    expect(((await r.json()) as { byDay: unknown[] }).byDay).toHaveLength(24)
  })
})

describe('createSupabaseRepos — danh mục, cài đặt (giả lập fetch)', () => {
  it('replace_catalog qua RPC, đọc catalog/settings đúng bảng', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('/catalog?')) return new Response(JSON.stringify([{ id: 's1', data: { id: 's1', name: 'Khám', price: 1 } }]), { status: 200 })
      if (url.includes('/settings?key=eq.system')) return new Response(JSON.stringify([{ data: { a: 1 } }]), { status: 200 })
      return new Response('null', { status: 200 })
    }) as unknown as typeof fetch
    const repos = createSupabaseRepos('https://demo.supabase.co', 'k', fake)
    expect(await repos.catalog.list('services')).toEqual([{ id: 's1', name: 'Khám', price: 1 }])
    await repos.catalog.replace('services', [{ id: 's2' }])
    expect(calls[1].url).toContain('/rpc/replace_catalog')
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ catalog_kind: 'services', items: [{ id: 's2', data: { id: 's2' } }] })
    expect(await repos.settings.get('system')).toEqual({ a: 1 })
    await repos.settings.set('system', { b: 2 })
    expect((calls[3].init.headers as Record<string, string>).Prefer).toBe('resolution=merge-duplicates')
  })
})
