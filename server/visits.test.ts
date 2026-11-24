import { afterEach, describe, expect, it } from 'vitest'
import type { Patient, Visit } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { visitService } from './visits'
import { setReposForTest } from './http'
import * as collection from '../api/visits/index'
import * as one from '../api/visits/[id]'
import * as status from '../api/visits/[id]/status'
import * as cancel from '../api/visits/[id]/cancel'

// 9h sáng 24/11/2026 giờ VN = 02:00 UTC
const clock = () => new Date('2026-11-24T02:00:00.000Z')
const existing: Patient = {
  id: 'p_old', code: 'BN000041', fullName: 'Trần Thị Bình', dob: '1985-01-02', gender: 'female', phone: '0987000111', address: 'Huế', createdAt: '2026-11-01T02:00:00.000Z',
}
const visitInput = (patch: Record<string, unknown> = {}) => ({
  date: '2026-11-24', time: '09:00', serviceId: 's1', fee: 150000, doctorId: 'd1', roomId: 'r1', category: 'walk_in', source: 'direct',
  reason: ' Sốt 2 ngày ', note: '', checkInNow: false, payNow: false, payMethod: 'cash', ...patch,
})
const newPatient = { fullName: 'Lê Minh Đức', dob: '1992-08-12', gender: 'male', phone: '0707400979', address: '' }

describe('visitService', () => {
  it('bệnh cũ: cấp STT tăng dần trong ngày, mã khám theo ngày + STT, chưa thu tiền', async () => {
    const svc = visitService(createMemoryRepos({ patients: [existing] }), { clock })
    const a = await svc.register({ patientId: 'p_old', visit: visitInput() })
    const b = await svc.register({ patientId: 'p_old', visit: visitInput({ time: '09:30' }) })
    expect(a.visit).toMatchObject({ queueNumber: 1, code: 'YMD202611240000001', status: 'registered', paymentStatus: 'unpaid', patientType: 'returning', reason: 'Sốt 2 ngày', endTime: '09:30' })
    expect(b.visit.queueNumber).toBe(2)
    // Ngày khác bắt đầu lại từ 1
    const c = await svc.register({ patientId: 'p_old', visit: visitInput({ date: '2026-11-25' }) })
    expect(c.visit.code).toBe('YMD202611250000001')
  })

  it('bệnh mới + tiếp nhận ngay + thu đủ: tạo hồ sơ, Chờ khám, phiếu thu có mã và các dòng', async () => {
    const svc = visitService(createMemoryRepos(), { clock, cashier: 'Lễ tân A' })
    const { patient, visit } = await svc.register({ patient: newPatient, visit: visitInput({ checkInNow: true, payNow: true, payMethod: 'transfer' }) })
    expect(patient.code).toBe('BN000001')
    expect(visit).toMatchObject({ status: 'waiting', paymentStatus: 'paid', patientType: 'new', checkedInAt: clock().toISOString() })
    expect(visit.payments[0]).toMatchObject({ amount: 150000, method: 'transfer', code: 'YMD202611240000001', cashier: 'Lễ tân A' })
    expect(visit.payments[0].lines?.[0]).toMatchObject({ refId: 'ck', name: 'Khám nhi tổng quát', unitPrice: 150000 })
  })

  it('thu một phần → partial, phí CLS cộng vào tổng', async () => {
    const svc = visitService(createMemoryRepos({ patients: [existing] }), { clock })
    const order = { id: 'o1', serviceId: 'cls_x', name: 'Công thức máu', quantity: 1, unitPrice: 120000 }
    const { visit } = await svc.register({ patientId: 'p_old', visit: visitInput({ fee: 270000, consultationFee: 150000, paraclinicalOrders: [order], payNow: true, paidAmountNow: 100000 }) })
    expect(visit).toMatchObject({ fee: 270000, paymentStatus: 'partial' })
    expect(visit.payments[0].lines).toBeUndefined()
  })

  it('kiểm tra dữ liệu lượt khám và hồ sơ bệnh mới', async () => {
    const svc = visitService(createMemoryRepos({ patients: [existing] }), { clock })
    await expect(svc.register({ patientId: 'p_old', visit: visitInput({ date: '24/11/2026', time: '9h', fee: -1 }) })).rejects.toMatchObject({
      status: 422, fields: { date: expect.any(String), time: expect.any(String), fee: expect.any(String) },
    })
    await expect(svc.register({ patient: { fullName: 'A' }, visit: visitInput() })).rejects.toMatchObject({ status: 422 })
    await expect(svc.register({ patientId: 'khong-co', visit: visitInput() })).rejects.toMatchObject({ status: 404 })
    await expect(svc.register({ visit: visitInput() })).rejects.toMatchObject({ status: 400 })
  })

  it('đổi trạng thái chỉ sang bước kế tiếp, ghi mốc giờ', async () => {
    const svc = visitService(createMemoryRepos({ patients: [existing] }), { clock })
    const { visit } = await svc.register({ patientId: 'p_old', visit: visitInput() })
    await expect(svc.setStatus(visit.id, { status: 'done' })).rejects.toMatchObject({ status: 409 })
    await expect(svc.setStatus(visit.id, { status: 'cancelled' })).rejects.toMatchObject({ status: 400 })
    expect(await svc.setStatus(visit.id, { status: 'waiting' })).toMatchObject({ status: 'waiting', checkedInAt: clock().toISOString() })
    expect(await svc.setStatus(visit.id, { status: 'in_progress' })).toMatchObject({ status: 'in_progress', startedAt: clock().toISOString() })
    expect(await svc.setStatus(visit.id, { status: 'done' })).toMatchObject({ status: 'done', finishedAt: clock().toISOString() })
    await expect(svc.cancel(visit.id, { reason: 'x' })).rejects.toMatchObject({ status: 409 })
  })

  it('huỷ: bắt buộc lý do; hoàn tiền thì thêm phiếu hoàn và trạng thái refunded; chỉ định chưa làm bị huỷ', async () => {
    const svc = visitService(createMemoryRepos({ patients: [existing] }), { clock })
    const order = { id: 'o1', serviceId: 'cls_x', name: 'X-quang', quantity: 1, unitPrice: 100000 }
    const { visit } = await svc.register({ patientId: 'p_old', visit: visitInput({ fee: 250000, consultationFee: 150000, paraclinicalOrders: [order], payNow: true }) })
    await expect(svc.cancel(visit.id, {})).rejects.toMatchObject({ status: 422 })
    const c = await svc.cancel(visit.id, { reason: 'Người bệnh về', refund: true })
    expect(c).toMatchObject({ status: 'cancelled', cancelReason: 'Người bệnh về', paymentStatus: 'refunded' })
    expect(c.payments.at(-1)).toMatchObject({ kind: 'refund', amount: 250000 })
    expect(c.paraclinicalOrders?.[0].performStatus).toBe('cancelled')

    const { visit: unpaid } = await svc.register({ patientId: 'p_old', visit: visitInput() })
    expect(await svc.cancel(unpaid.id, { reason: 'Đặt nhầm' })).toMatchObject({ paymentStatus: 'cancelled' })
  })

  it('danh sách: mặc định hôm nay theo giờ VN, lọc trạng thái, tìm theo tên không dấu / mã khám, sắp xếp theo STT', async () => {
    const old: Visit = {
      id: 'v_old', code: 'YMD202611230000001', patientId: 'p_old', queueNumber: 1, date: '2026-11-23', time: '08:00', doctorId: 'd1', roomId: 'r1', serviceId: 's1',
      fee: 0, payments: [], paymentStatus: 'none', status: 'done', patientType: 'returning', category: 'walk_in', source: 'direct', reason: '', note: '', createdAt: '2026-11-23T01:00:00.000Z',
    }
    const svc = visitService(createMemoryRepos({ patients: [existing], visits: [old] }), { clock })
    await svc.register({ patient: newPatient, visit: visitInput({ checkInNow: true }) })
    await svc.register({ patientId: 'p_old', visit: visitInput() })
    const today = await svc.list({})
    expect(today.items.map((r) => r.visit.queueNumber)).toEqual([1, 2])
    expect(today.items[0].patient.fullName).toBe('Lê Minh Đức')
    expect((await svc.list({ status: 'waiting' })).total).toBe(1)
    expect((await svc.list({ q: 'tran thi' })).items[0].patient.id).toBe('p_old')
    expect((await svc.list({ dateFrom: '2026-11-23', dateTo: '2026-11-24', q: 'YMD202611230000001' })).items[0].visit.id).toBe('v_old')
    await expect(svc.list({ dateFrom: '2026-11-25', dateTo: '2026-11-24' })).rejects.toMatchObject({ status: 422 })
  })
})

describe('API /api/visits', () => {
  afterEach(() => setReposForTest(null))

  it('đăng ký → xem → đổi trạng thái → huỷ qua HTTP', async () => {
    setReposForTest(createMemoryRepos())
    const res = await collection.POST(new Request('http://x/api/visits', { method: 'POST', body: JSON.stringify({ patient: newPatient, visit: visitInput({ date: new Date().toISOString().slice(0, 10) }) }) }))
    expect(res.status).toBe(201)
    const { visit } = (await res.json()) as { visit: Visit }

    const got = await one.GET(new Request(`http://x/api/visits/${visit.id}`))
    expect(((await got.json()) as Visit).code).toBe(visit.code)

    const st = await status.POST(new Request(`http://x/api/visits/${visit.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'waiting' }) }))
    expect(((await st.json()) as Visit).status).toBe('waiting')

    const bad = await status.POST(new Request(`http://x/api/visits/${visit.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'done' }) }))
    expect(bad.status).toBe(409)

    const cx = await cancel.POST(new Request(`http://x/api/visits/${visit.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Bỏ về' }) }))
    expect(((await cx.json()) as Visit).status).toBe('cancelled')

    const list = await collection.GET(new Request(`http://x/api/visits?dateFrom=${visit.date}&status=cancelled`))
    expect(((await list.json()) as { total: number }).total).toBe(1)
  })
})

describe('createSupabaseRepos — lượt khám và bộ đếm (giả lập fetch)', async () => {
  const { createSupabaseRepos } = await import('./supabaseRepo')
  it('lọc theo khoảng ngày / trạng thái, gọi bump_counter, không gửi id/code khi sửa', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('bump_counter')) return new Response('5', { status: 200 })
      return new Response(JSON.stringify([{ id: 'v1', code: 'YMD1', queue_number: 3, patient_id: 'p1', cancel_reason: null }]), { status: 200 })
    }) as unknown as typeof fetch
    const repos = createSupabaseRepos('https://demo.supabase.co', 'k', fake)
    const rows = await repos.visits.list({ dateFrom: '2026-11-01', dateTo: '2026-11-24', status: 'waiting' })
    expect(rows[0]).toEqual({ id: 'v1', code: 'YMD1', queueNumber: 3, patientId: 'p1' })
    const url = decodeURIComponent(calls[0].url)
    expect(url).toContain('date=gte.2026-11-01')
    expect(url).toContain('date=lte.2026-11-24')
    expect(url).toContain('status=eq.waiting')
    expect(await repos.counters.next('queue:2026-11-24', 2)).toBe(5)
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ counter_key: 'queue:2026-11-24', floor_value: 2 })
    await repos.visits.update('v1', { id: 'x', code: 'y', status: 'waiting', checkedInAt: 't' } as never)
    expect(JSON.parse(String(calls[2].init.body))).toEqual({ status: 'waiting', checked_in_at: 't' })
  })
})
