import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { addDays, addMinutesToTime, ageInYears, ageLabel, formatDateVN } from './date'
import { formatMoney, formatPhone, initials, normalizeText } from './format'

const BOM = '﻿'
const body = (csv: string) => csv.slice(BOM.length).split('\r\n')

describe('toCsv', () => {
  it('có BOM, phân tách dòng CRLF, bọc ô có dấu phẩy / ngoặc kép / xuống dòng', () => {
    const csv = toCsv(['Tên', 'Ghi chú'], [['A, B', 'nói "chào"'], ['x', 'dòng 1\ndòng 2']])
    expect(csv.startsWith(BOM)).toBe(true)
    const [h, r1] = body(csv)
    expect(h).toBe('Tên,Ghi chú')
    expect(r1).toBe('"A, B","nói ""chào"""')
    expect(csv).toContain('"dòng 1\ndòng 2"')
  })

  it('chặn CSV injection với chuỗi bắt đầu bằng = + - @', () => {
    const [, r] = body(toCsv(['a', 'b', 'c', 'd'], [['=HYPERLINK("x")', '+1+1', '@SUM(A1)', '-2+3']]))
    expect(r).toBe(`"'=HYPERLINK(""x"")",'+1+1,'@SUM(A1),'-2+3`)
  })

  it('giữ nguyên số âm, chuỗi số âm và ô "--"', () => {
    const [, r] = body(toCsv(['a', 'b', 'c'], [[-150000, '-150.000', '--']]))
    expect(r).toBe('-150000,-150.000,--')
  })
})

describe('ngày giờ', () => {
  it('tuổi nhi khoa: ngày / tháng / tuổi', () => {
    expect(ageLabel('2026-11-10', '2026-11-22')).toBe('12 ngày')
    expect(ageLabel('2026-05-22', '2026-11-22')).toBe('6 tháng')
    expect(ageLabel('2025-01-23', '2026-11-22')).toBe('21 tháng')
    expect(ageLabel('2020-11-23', '2026-11-22')).toBe('5 tuổi')
    expect(ageLabel('2027-01-01', '2026-11-22')).toBe('')
  })

  it('ageInYears tính đúng trước / sau sinh nhật', () => {
    expect(ageInYears('2020-11-22', '2026-11-22')).toBe(6)
    expect(ageInYears('2020-11-23', '2026-11-22')).toBe(5)
  })

  it('addDays qua cuối tháng / năm nhuận, addMinutesToTime qua nửa đêm', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addMinutesToTime('23:45', 30)).toBe('00:15')
    expect(addMinutesToTime('bad', 30)).toBe('bad')
    expect(formatDateVN('2026-11-22')).toBe('22/11/2026')
  })
})

describe('định dạng', () => {
  it('tiền, số điện thoại, chữ viết tắt', () => {
    expect(formatMoney(150000)).toBe('150.000đ')
    expect(formatPhone('0901234567')).toBe('0901 234 567')
    expect(formatPhone('+84 90')).toBe('+84 90')
    expect(initials('Nguyễn Văn An')).toBe('NA')
  })

  it('tìm không dấu: bỏ dấu, đ -> d, chữ thường', () => {
    expect(normalizeText('  Đặng Thị Ánh ')).toBe('dang thi anh')
  })
})
