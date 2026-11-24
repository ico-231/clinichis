import { afterEach, describe, expect, it } from 'vitest'
import type { Patient, Visit } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { visitService } from './visits'
import { paymentService } from './payments'
import { setReposForTest } from './http'
import * as payments from './routes/visits/[id]/payments'
import * as invoice from './routes/visits/[id]/payments/[paymentId]/invoice'

const clock = () => new Date('2026-11-24T02:00:00.000Z')
const patient: Patient = { id: 'p1', code: 'BN000001', fullName: 'Trần Thị Bình', dob: '1985-01-02', gender: 'female', phone: '0987000111', address: '', createdAt: 'x' }
const order = { id: 'o1', serviceId: 'cls_x', name: 'Công thức máu', quantity: 1, unitPrice: 120000 }

async function setup(visitPatch: Record<string, unknown> = {}) {
  const repos = createMemoryRepos({ patients: [patient] })
  const { visit } = await visitService(repos, { clock }).register({
    patientId: 'p1',
    visit: {
      date: '2026-11-24', time: '09:00', serviceId: 's1', fee: 270000, consultationFee: 150000, paraclinicalOrders: [order], doctorId: 'd1', roomId: 'r1',
      category: 'walk_in', source: 'direct', reason: 'Sốt', note: '', checkInNow: true, payNow: false, payMethod: 'cash', ...visitPatch,
    },
  })
  return { repos, visit, svc: paymentService(repos, { clock, cashier: 'Thu ngân B' }) }
}

describe('paymentService', () => {
  it('tổng hợp: dòng công khám + CLS, chưa thu gì', async () => {
    const { svc, visit } = await setup()
    const s = await svc.summary(visit.id)
    expect(s).toMatchObject({ fee: 270000, paid: 0, remaining: 270000, paymentStatus: 'unpaid' })
    expect(s.lines.map((l) => [l.refId, l.unitPrice, l.paid])).toEqual([['ck', 150000, false], ['o1', 120000, false]])
  })

  it('thu một dòng có giảm giá → partial; giá lấy từ máy chủ, bỏ qua giá client gửi', async () => {
    const { svc, visit } = await setup()
    const r = await svc.checkout(visit.id, { items: [{ kind: 'consultation', refId: 'ck', discount: 20000, unitPrice: 1 }], method: 'cash', customerPaid: 200000 })
    expect(r.receipt).toMatchObject({ amount: 130000, code: 'YMD202611240000001', cashier: 'Thu ngân B', customerPaid: 200000 })
    expect(r.receipt.lines?.[0]).toMatchObject({ unitPrice: 150000, discount: 20000 })
    expect(r.change).toBe(70000)
    expect(r.billing).toMatchObject({ paid: 130000, discount: 20000, remaining: 120000, paymentStatus: 'partial' })
    expect(r.billing.lines.find((l) => l.refId === 'ck')?.paid).toBe(true)

    // Thu nốt CLS, giảm giá tổng → paid, mã phiếu tăng
    const r2 = await svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'o1' }], discount: 20000, method: 'transfer' })
    expect(r2.receipt).toMatchObject({ amount: 100000, code: 'YMD202611240000002' })
    expect(r2.billing).toMatchObject({ remaining: 0, paymentStatus: 'paid' })
  })

  it('chặn: dòng đã thu, dòng không có, giảm giá quá tiền, tiền mặt khách đưa thiếu, lượt đã huỷ', async () => {
    const { svc, visit, repos } = await setup()
    await svc.checkout(visit.id, { items: [{ kind: 'consultation', refId: 'ck' }], method: 'cash' })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'consultation', refId: 'ck' }], method: 'cash' })).rejects.toMatchObject({ status: 422, fields: { 'items.0': 'Dòng này đã thu' } })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'nope' }], method: 'cash' })).rejects.toMatchObject({ fields: { 'items.0': 'Không có dòng này để thu' } })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'o1', discount: 999999 }], method: 'cash' })).rejects.toMatchObject({ fields: { 'items.0.discount': expect.any(String) } })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'o1' }], discount: 200000, method: 'cash' })).rejects.toMatchObject({ fields: { discount: expect.any(String) } })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'o1' }], method: 'cash', customerPaid: 1000 })).rejects.toMatchObject({ fields: { customerPaid: expect.any(String) } })
    await expect(svc.checkout(visit.id, { items: [], method: 'bitcoin' })).rejects.toMatchObject({ fields: { items: expect.any(String), method: expect.any(String) } })
    await visitService(repos, { clock }).cancel(visit.id, { reason: 'Bỏ về' })
    await expect(svc.checkout(visit.id, { items: [{ kind: 'paraclinical', refId: 'o1' }], method: 'cash' })).rejects.toMatchObject({ status: 409 })
  })

  it('hoá đơn điện tử: kiểm tra MST doanh nghiệp, không sửa được khi đã xuất', async () => {
    const { svc, visit } = await setup()
    const { receipt } = await svc.checkout(visit.id, { items: [{ kind: 'consultation', refId: 'ck' }], method: 'cash' })
    await expect(svc.setInvoice(visit.id, receipt.id, { type: 'company', name: 'Cty ABC', taxCode: '123' })).rejects.toMatchObject({ fields: { 'invoice.taxCode': expect.any(String) } })
    const inv = await svc.setInvoice(visit.id, receipt.id, { invoice: { type: 'company', name: 'Cty ABC', taxCode: '0101234567', email: 'kt@abc.vn', status: 'issued' } })
    expect(inv.invoice).toMatchObject({ type: 'company', taxCode: '0101234567', status: 'issued', issuedAt: expect.any(String) })
    await expect(svc.setInvoice(visit.id, receipt.id, { type: 'personal', name: 'A' })).rejects.toMatchObject({ status: 409 })
    await expect(svc.setInvoice(visit.id, 'nope', { type: 'personal', name: 'A' })).rejects.toMatchObject({ status: 404 })
  })

  it('lượt đã thu đủ lúc tiếp nhận thì không còn dòng nào để thu', async () => {
    const { svc, visit } = await setup({ payNow: true })
    const s = await svc.summary(visit.id)
    expect(s).toMatchObject({ remaining: 0, paymentStatus: 'paid' })
    expect(s.lines.every((l) => l.paid)).toBe(true)
  })
})

describe('API /api/visits/:id/payments', () => {
  afterEach(() => setReposForTest(null))

  it('GET tổng hợp, POST thu tiền, PUT hoá đơn', async () => {
    const { repos, visit } = await setup()
    setReposForTest(repos)
    const s = await payments.GET(new Request(`http://x/api/visits/${visit.id}/payments`))
    expect(((await s.json()) as { remaining: number }).remaining).toBe(270000)
    const res = await payments.POST(new Request(`http://x/api/visits/${visit.id}/payments`, { method: 'POST', body: JSON.stringify({ items: [{ kind: 'consultation', refId: 'ck' }, { kind: 'paraclinical', refId: 'o1' }], method: 'card' }) }))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { receipt: { id: string; amount: number }; billing: { paymentStatus: Visit['paymentStatus'] } }
    expect(body.receipt.amount).toBe(270000)
    expect(body.billing.paymentStatus).toBe('paid')
    const inv = await invoice.PUT(new Request(`http://x/api/visits/${visit.id}/payments/${body.receipt.id}/invoice`, { method: 'PUT', body: JSON.stringify({ type: 'personal', name: 'Trần Thị Bình' }) }))
    expect(inv.status).toBe(200)
  })
})
