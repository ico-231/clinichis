import { describe, expect, it } from 'vitest'
import { daysBetweenISO, shiftDemoDates } from './demoShift'

describe('Dời ngày dữ liệu demo', () => {
  it('đếm số ngày theo lịch, qua tháng / năm', () => {
    expect(daysBetweenISO('2026-11-26', '2026-11-29')).toBe(3)
    expect(daysBetweenISO('2026-12-30', '2027-01-02')).toBe(3)
    expect(daysBetweenISO('2026-11-26', '2026-11-26')).toBe(0)
  })

  it('dời ngày, giờ ISO và phần ngày trong mã khám / mã phiếu; giữ nguyên số khác', () => {
    const src = JSON.stringify({
      date: '2026-11-26',
      at: '2026-11-25T23:30:00.000Z',
      dob: '2020-02-28',
      code: 'YMD202611260000001',
      phone: '0912345678',
      fee: 20261126,
      note: 'Tái khám 2026-11-30',
    })
    const out = JSON.parse(shiftDemoDates(src, 3))
    expect(out).toEqual({
      date: '2026-11-29',
      at: '2026-11-28T23:30:00.000Z',
      dob: '2020-03-02',
      code: 'YMD202611290000001',
      phone: '0912345678',
      fee: 20261126,
      note: 'Tái khám 2026-12-03',
    })
  })

  it('0 ngày thì giữ nguyên chuỗi', () => {
    const s = '{"date":"2026-11-26"}'
    expect(shiftDemoDates(s, 0)).toBe(s)
  })
})
