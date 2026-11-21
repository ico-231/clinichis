import { describe, expect, it } from 'vitest'
import { filtersRevealingVisit } from './useReceptionData'
import type { ReceptionFilters, Visit } from '@/store/types'

const filters: ReceptionFilters = {
  search: 'abc',
  dateFrom: '2026-11-17',
  dateTo: '2026-11-17',
  status: 'done',
  payment: 'paid',
  category: 'booked',
  source: 'external',
  doctorId: 'all',
  roomId: 'all',
  patientType: 'all',
}

const v = { date: '2026-11-18', status: 'registered', paymentStatus: 'unpaid', category: 'walk_in', source: 'direct', doctorId: 'd1', roomId: 'r1', patientType: 'new' } as Visit

describe('filtersRevealingVisit', () => {
  it('nới mọi tiêu chí đang che lượt mới trong một lần', () => {
    expect(filtersRevealingVisit(filters, v)).toMatchObject({ search: '', dateFrom: '2026-11-17', dateTo: '2026-11-18', status: 'all', payment: 'all', category: 'all', source: 'all' })
  })

  it('giữ tiêu chí đang khớp', () => {
    const next = filtersRevealingVisit({ ...filters, source: 'onsite', status: 'registered' }, v)!
    expect(next.source).toBe('onsite')
    expect(next.status).toBe('registered')
  })

  it('trả về null khi lượt mới đã hiển thị', () => {
    const ok: ReceptionFilters = { ...filters, search: '', dateTo: '2026-11-18', status: 'all', payment: 'all', category: 'all', source: 'all' }
    expect(filtersRevealingVisit(ok, v)).toBeNull()
  })
})
