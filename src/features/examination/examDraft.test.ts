import { describe, expect, it } from 'vitest'
import { computeBmi, computeQuantity, doseSummary } from './examDraft'
import { RUNTIME, runtimeCode } from '@/store/runtime'
import { emrCodeOf } from '../emr/emrData'
import type { PrescriptionItem, Visit } from '@/store/types'

describe('tính toán khi khám', () => {
  it('BMI = cân nặng / (chiều cao m)^2, chấp nhận dấu phẩy', () => {
    expect(computeBmi('68', '8,2')).toBe('17.7')
    expect(computeBmi('', '20')).toBe('')
  })

  it('số lượng thuốc = số ngày × tổng liều/ngày (làm tròn lên)', () => {
    expect(computeQuantity({ days: 3, morning: 1, noon: 0, afternoon: 1, evening: 0 })).toBe(6)
    expect(computeQuantity({ days: 5, morning: 0.5, noon: 0, afternoon: 0.5, evening: 0 })).toBe(5)
    expect(computeQuantity({ days: 3, morning: 0.5, noon: 0, afternoon: 0, evening: 0 })).toBe(2)
  })

  it('diễn giải liều cho bản in', () => {
    const item = { morning: 1, noon: 0, afternoon: 1.5, evening: 0, doseUnit: 'Gói' } as PrescriptionItem
    expect(doseSummary(item)).toBe('Sáng: 1 Gói, Chiều: 1,5 Gói')
  })
})

describe('mã khám / mã bệnh án', () => {
  it('mã khám theo tiền tố và độ dài cấu hình', () => {
    expect(runtimeCode('2026-11-17', 12)).toBe('YMD202611170000012')
    const saved = { ...RUNTIME }
    Object.assign(RUNTIME, { codePrefix: 'PKN', seqDigits: 4 })
    expect(runtimeCode('2026-11-17', 12)).toBe('PKN202611170012')
    Object.assign(RUNTIME, saved)
  })

  it('mã bệnh án yy.mm.dd.STT', () => {
    expect(emrCodeOf({ date: '2026-11-13', queueNumber: 3 } as Visit)).toBe('26.11.13.000003')
  })
})
