import { afterEach, describe, expect, it } from 'vitest'
import type { Patient } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { createSupabaseRepos } from './supabaseRepo'
import { patientService } from './patients'
import { visitService } from './visits'
import { paymentService } from './payments'
import { examService } from './exam'
import { reportService } from './reports'
import { guard, resetRateLimitForTest, segmentFromEnd } from './http'
import { isISODate } from './time'

/* Test cho các lỗi tìm ra khi audit 25/11/2026 */

const clock = () => new Date('2026-11-24T02:00:00.000Z')
const child: Patient = { id: 'p1', code: 'BN000001', fullName: 'Lê Minh Đức', dob: '2019-08-12', gender: 'male', phone: '0707400979', address: '', guardianName: 'Lê Văn Bố', createdAt: 'x' }
const visitBody = (patch: Record<string, unknown> = {}) => ({
  date: '2026-11-24', time: '09:00', serviceId: 's1', fee: 150000, doctorId: 'd1', roomId: 'r1', category: 'walk_in', source: 'direct', reason: 'Sốt', note: '',
  checkInNow: true, payNow: false, payMethod: 'cash', ...patch,
})

describe('ngày phải có thật trên lịch (JS Date.parse nhận cả 31/02)', () => {
  it('isISODate', () => {
    expect(isISODate('2024-02-29')).toBe(true)
    expect(isISODate('2026-02-29')).toBe(false)
    expect(isISODate('2026-02-31')).toBe(false)
    expect(isISODate('2026-13-01')).toBe(false)
    expect(isISODate('26-1-1')).toBe(false)
  })

  it('hồ sơ, lượt khám, báo cáo, danh sách chỉ định trả 422 thay vì để cơ sở dữ liệu báo 500', async () => {
    const repos = createMemoryRepos({ patients: [child] })
    await expect(patientService(repos).create({ fullName: 'Ngô Thị Lan', dob: '1990-02-31', gender: 'female', phone: '0912000000' })).rejects.toMatchObject({ status: 422, fields: { dob: expect.any(String) } })
    await expect(visitService(repos, { clock }).register({ patientId: 'p1', visit: visitBody({ date: '2026-11-31' }) })).rejects.toMatchObject({ status: 422, fields: { date: expect.any(String) } })
    await expect(reportService(repos, { clock }).summary({ dateFrom: '2026-02-30' })).rejects.toMatchObject({ status: 422 })
    await expect(examService(repos, { clock }).listOrders({ dateFrom: '2026-11-31' })).rejects.toMatchObject({ status: 422 })
  })
})

describe('hồ sơ: trường chữ phải là chuỗi', () => {
  it('số / đối tượng ở cột text → 422', async () => {
    const svc = patientService(createMemoryRepos())
    await expect(svc.create({ fullName: 'Ngô Thị Lan', dob: '1990-01-01', gender: 'female', phone: '0912000000', cccd: 123, address: { a: 1 }, relative: 'x' })).rejects.toMatchObject({
      status: 422, fields: { cccd: 'Phải là chuỗi', address: 'Phải là chuỗi', relative: 'Phải là đối tượng' },
    })
  })
})

describe('số phiếu thu không bị nhảy khi dữ liệu sai', () => {
  it('hoá đơn sai: báo lỗi trước khi lấy số phiếu', async () => {
    const repos = createMemoryRepos({ patients: [child] })
    const { visit } = await visitService(repos, { clock }).register({ patientId: 'p1', visit: visitBody() })
    const keys: string[] = []
    const next = repos.counters.next.bind(repos.counters)
    repos.counters.next = (key, floor) => (keys.push(key), next(key, floor))
    await expect(paymentService(repos, { clock }).checkout(visit.id, { items: [{ kind: 'consultation', refId: 'ck' }], method: 'cash', invoice: { type: 'company', name: 'ACME', taxCode: 'sai' } })).rejects.toMatchObject({ status: 422 })
    expect(keys.filter((k) => k.startsWith('receipt:'))).toEqual([])
  })

  it('đăng ký thu ngay nhưng tổng phí > 0 và thu 0đ: không lấy số phiếu (tính phí giống buildVisit)', async () => {
    const repos = createMemoryRepos({ patients: [child] })
    const keys: string[] = []
    const next = repos.counters.next.bind(repos.counters)
    repos.counters.next = (key, floor) => (keys.push(key), next(key, floor))
    const { visit } = await visitService(repos, { clock }).register({ patientId: 'p1', visit: visitBody({ fee: 0, consultationFee: 150000, payNow: true, paidAmountNow: 0 }) })
    expect(visit.payments).toEqual([])
    expect(keys.filter((k) => k.startsWith('receipt:'))).toEqual([])
  })
})

describe('createSupabaseRepos — phân trang, chia lô, thứ tự, lỗi', () => {
  const fakeRows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `v${from + i}`, date: '2026-11-24', queue_number: from + i, payments: [] }))

  it('lượt khám quá 1000 dòng: đọc tiếp trang sau, không bị cắt', async () => {
    const urls: string[] = []
    const fake = (async (url: string) => {
      urls.push(url)
      const offset = Number(new URL(url).searchParams.get('offset'))
      return new Response(JSON.stringify(offset === 0 ? fakeRows(1000) : fakeRows(5, 1000)), { status: 200 })
    }) as unknown as typeof fetch
    const visits = await createSupabaseRepos('https://demo.supabase.co', 'sb_secret_x', fake).visits.list({ dateFrom: '2025-08-01', dateTo: '2026-11-24' })
    expect(visits).toHaveLength(1005)
    expect(urls).toHaveLength(2)
    expect(new URL(urls[1]).searchParams.get('order')).toBe('date.desc,queue_number.asc,id.asc')
  })

  it('getMany chia lô 100 id / lần; danh mục sắp theo position', async () => {
    const urls: string[] = []
    const fake = (async (url: string) => {
      urls.push(url)
      return new Response('[]', { status: 200 })
    }) as unknown as typeof fetch
    const repos = createSupabaseRepos('https://demo.supabase.co', 'k', fake)
    await repos.patients.getMany(Array.from({ length: 250 }, (_, i) => `p${i}`))
    expect(urls).toHaveLength(3)
    urls.length = 0
    await repos.catalog.list('services')
    expect(new URL(urls[0]).searchParams.get('order')).toBe('position.asc,id.asc')
  })

  it('23503 (tham chiếu không tồn tại) → 422, không báo nhầm là trùng', async () => {
    const fake = (async () => new Response(JSON.stringify({ code: '23503', message: 'violates foreign key' }), { status: 409 })) as unknown as typeof fetch
    await expect(createSupabaseRepos('https://demo.supabase.co', 'k', fake).visits.insert({ id: 'v1' } as never)).rejects.toMatchObject({ status: 422 })
  })
})

describe('http', () => {
  afterEach(() => resetRateLimitForTest())

  it('giới hạn lượt gọi tính cả lần gửi sai mã (chặn dò mã)', () => {
    const env = { CLINIC_API_KEY: 'dung', CLINIC_RATE_LIMIT: '2' }
    const req = () => new Request('http://x/api/patients', { headers: { 'x-forwarded-for': '1.2.3.4', 'x-clinic-key': 'sai' } })
    expect(() => guard(req(), env, 0)).toThrow(expect.objectContaining({ status: 401 }))
    expect(() => guard(req(), env, 1)).toThrow(expect.objectContaining({ status: 401 }))
    expect(() => guard(req(), env, 2)).toThrow(expect.objectContaining({ status: 429 }))
  })

  it('đường dẫn có % hỏng → 400, không phải 500', () => {
    expect(() => segmentFromEnd(new Request('http://x/api/patients/%E0%A4%A'), 0)).toThrow(expect.objectContaining({ status: 400 }))
  })
})
