import { describe, expect, it } from 'vitest'
import { billableLines, clsCharge, derivePaymentStatus, discountAmount, isLinePaid, nextReceiptCode, paidAmount, remainingAmount, patientDeleteBlock, unpaidLines } from './billing'
import type { ParaclinicalOrderItem, PaymentRecord, Visit } from './types'

const order = (id: string, price: number): ParaclinicalOrderItem => ({
  id,
  serviceId: `s_${id}`,
  providerId: 'lab_internal',
  providerName: 'Lab nội bộ',
  providerAddress: '',
  name: `CLS ${id}`,
  groupLabel: '',
  category: 'lab',
  unitPrice: price,
  quantity: 1,
  instruction: '',
})

const visit = (patch: Partial<Visit> = {}): Visit => ({
  id: 'v1',
  code: 'YMD202611170000001',
  patientId: 'p1',
  queueNumber: 1,
  date: '2026-11-17',
  time: '08:00',
  doctorId: 'd1',
  roomId: 'r1',
  serviceId: 's1',
  consultationFee: 150_000,
  paraclinicalOrders: [order('a', 100_000), order('b', 200_000)],
  fee: 450_000,
  payments: [],
  paymentStatus: 'unpaid',
  status: 'in_progress',
  patientType: 'new',
  category: 'walk_in',
  source: 'direct',
  reason: '',
  note: '',
  createdAt: '2026-11-17T01:00:00.000Z',
  ...patch,
})

const pay = (p: Partial<PaymentRecord>): PaymentRecord => ({ id: 'pay', kind: 'payment', amount: 0, method: 'cash', at: '2026-11-17T02:00:00.000Z', ...p })
const lineA = { kind: 'paraclinical' as const, refId: 'a', name: 'a', unit: 'Lượt', quantity: 1, unitPrice: 100_000, discount: 10_000 }

describe('billing', () => {
  it('liệt kê công khám + từng chỉ định CLS', () => {
    expect(billableLines(visit()).map((l) => [l.kind, l.unitPrice])).toEqual([
      ['consultation', 150_000],
      ['paraclinical', 100_000],
      ['paraclinical', 200_000],
    ])
  })

  it('phiếu thu theo dòng: chỉ dòng đã thu được đánh dấu', () => {
    const v = visit({ payments: [pay({ amount: 90_000, lines: [lineA] })] })
    expect(isLinePaid(v, { kind: 'paraclinical', refId: 'a' })).toBe(true)
    expect(isLinePaid(v, { kind: 'paraclinical', refId: 'b' })).toBe(false)
    expect(unpaidLines(v).map((l) => l.refId)).toEqual(['ck', 'b'])
  })

  it('giảm giá dòng + giảm giá tổng làm giảm số còn phải thu', () => {
    const v = visit({ payments: [pay({ amount: 85_000, discount: 5_000, lines: [lineA] })] })
    expect(paidAmount(v)).toBe(85_000)
    expect(discountAmount(v)).toBe(15_000)
    expect(remainingAmount(v)).toBe(450_000 - 85_000 - 15_000)
    expect(derivePaymentStatus(v, 'unpaid')).toBe('partial')
  })

  it('phiếu cũ không có dòng: phân bổ từ công khám trước', () => {
    const v = visit({ payments: [pay({ amount: 250_000 })], paymentStatus: 'partial' })
    expect(isLinePaid(v, { kind: 'consultation', refId: 'ck' })).toBe(true)
    expect(isLinePaid(v, { kind: 'paraclinical', refId: 'a' })).toBe(true)
    expect(isLinePaid(v, { kind: 'paraclinical', refId: 'b' })).toBe(false)
  })

  it('hoàn tiền: không còn dòng nào được tính là đã thu', () => {
    const v = visit({ paymentStatus: 'refunded', payments: [pay({ amount: 450_000 }), pay({ id: 'r', kind: 'refund', amount: 450_000 })] })
    expect(paidAmount(v)).toBe(0)
    expect(unpaidLines(v)).toHaveLength(3)
    expect(derivePaymentStatus(v, 'refunded')).toBe('refunded')
  })

  it('tổng 0đ: "Không thanh toán", chỉ "đã thanh toán" khi đã xác nhận phiếu thu', () => {
    const v = visit({ consultationFee: 0, paraclinicalOrders: [], fee: 0 })
    expect(derivePaymentStatus(v, 'unpaid')).toBe('none')
    expect(derivePaymentStatus({ ...v, payments: [pay({ amount: 0 })] }, 'unpaid')).toBe('paid')
  })

  it('mã phiếu thu tăng theo ngày', () => {
    const v = visit({ payments: [pay({ code: 'YMD202611170000004' }), pay({ code: 'YMD202611160000009' })] })
    expect(nextReceiptCode([v], '2026-11-17')).toBe('YMD202611170000005')
    expect(nextReceiptCode([v], '2026-11-18')).toBe('YMD202611180000001')
  })

  it('chỉ định huỷ / NB không đến: không tính tiền nếu chưa thu, vẫn giữ nếu đã thu', () => {
    const orders = [{ ...order('a', 100_000), performStatus: 'cancelled' as const }, { ...order('b', 200_000), performStatus: 'no_show' as const }]
    expect(clsCharge(orders)).toBe(0)
    expect(billableLines(visit({ paraclinicalOrders: orders })).map((l) => l.refId)).toEqual(['ck'])
    const paidA = [pay({ amount: 90_000, lines: [lineA] })]
    expect(clsCharge(orders, paidA)).toBe(100_000)
  })
})

describe('patientDeleteBlock', () => {
  const pay = { id: 'p', kind: 'payment' as const, amount: 100, method: 'cash' as const, at: '' }
  it('cho xoá hồ sơ chưa khám, chưa thu tiền', () => {
    expect(patientDeleteBlock([])).toBeNull()
    expect(patientDeleteBlock([{ status: 'registered', payments: [] }, { status: 'cancelled', payments: [] }])).toBeNull()
  })
  it('chặn khi đã khám hoặc đã có phiếu thu', () => {
    expect(patientDeleteBlock([{ status: 'done', payments: [] }])).toMatch(/1 lượt đã khám/)
    expect(patientDeleteBlock([{ status: 'cancelled', payments: [pay] }])).toMatch(/1 phiếu thu/)
  })
})
