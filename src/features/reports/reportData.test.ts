import { describe, expect, it } from 'vitest'
import { netOf, revenueEntries } from './reportData'
import type { Visit } from '@/store/types'

const visit = (payments: Visit['payments']) => ({ id: 'v1', payments }) as Visit

describe('revenueEntries', () => {
  it('hoàn tiền được chia theo tỉ lệ công khám / CLS đã thu', () => {
    const v = visit([
      {
        id: 'p1',
        kind: 'payment',
        amount: 400_000,
        method: 'cash',
        at: '2026-11-20T02:00:00.000Z',
        lines: [
          { kind: 'consultation', refId: 'ck', name: 'Công khám', unit: 'Lần', quantity: 1, unitPrice: 100_000, discount: 0 },
          { kind: 'paraclinical', refId: 'o1', name: 'Siêu âm', unit: 'Lần', quantity: 1, unitPrice: 300_000, discount: 0 },
        ],
      },
      { id: 'r1', kind: 'refund', amount: 400_000, method: 'cash', at: '2026-11-20T03:00:00.000Z' },
    ])
    const [pay, refund] = revenueEntries([v])
    expect(pay).toMatchObject({ consultation: 100_000, paraclinical: 300_000 })
    expect(refund).toMatchObject({ consultation: -100_000, paraclinical: -300_000 })
    expect(netOf(pay) + netOf(refund)).toBe(0)
  })

  it('phiếu cũ không có dòng: tính vào công khám', () => {
    const [e] = revenueEntries([visit([{ id: 'p', kind: 'payment', amount: 150_000, method: 'cash', at: '2026-11-20T02:00:00.000Z' }])])
    expect(e).toMatchObject({ consultation: 150_000, paraclinical: 0 })
  })
})
