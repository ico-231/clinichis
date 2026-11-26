import { describe, expect, it } from 'vitest'
import { normalizeTime } from './TimeInput'

describe('normalizeTime: ô giờ luôn 24 giờ', () => {
  it('đọc nhiều kiểu gõ', () => {
    expect(normalizeTime('13:30')).toBe('13:30')
    expect(normalizeTime('1330')).toBe('13:30')
    expect(normalizeTime('930')).toBe('09:30')
    expect(normalizeTime('9')).toBe('09:00')
    expect(normalizeTime('7:5')).toBe('07:05')
  })
  it('giờ sai hoặc trống ⇒ rỗng (ô giữ giá trị cũ)', () => {
    expect(normalizeTime('')).toBe('')
    expect(normalizeTime('25:00')).toBe('')
    expect(normalizeTime('12:75')).toBe('')
    expect(normalizeTime('abc')).toBe('')
  })
})
