import { describe, expect, it } from 'vitest'
import { findDuplicatePatients } from './patientRules'
import type { Patient } from './types'

const p = (id: string, fullName: string, dob: string, phone: string) => ({ id, fullName, dob, phone }) as Patient
const list = [p('a', 'Nguyễn Minh An', '2020-01-05', '0901111111'), p('b', 'Nguyễn Minh Bảo', '2021-02-02', '0901111111')]

describe('findDuplicatePatients', () => {
  it('trùng họ tên + ngày sinh (không phân biệt hoa thường, dấu cách)', () => {
    expect(findDuplicatePatients(list, { fullName: '  NGUYỄN  MINH AN ', dob: '2020-01-05', phone: '' }).map((x) => x.id)).toEqual(['a'])
  })
  it('trùng họ tên + số điện thoại', () => {
    expect(findDuplicatePatients(list, { fullName: 'Nguyễn Minh An', dob: '2019-01-01', phone: '0901 111 111' }).map((x) => x.id)).toEqual(['a'])
  })
  it('anh chị em chung số điện thoại không bị coi là trùng', () => {
    expect(findDuplicatePatients(list, { fullName: 'Nguyễn Minh Châu', dob: '2023-03-03', phone: '0901111111' })).toEqual([])
  })
  it('bỏ qua chính hồ sơ đang sửa', () => {
    expect(findDuplicatePatients(list, { fullName: 'Nguyễn Minh An', dob: '2020-01-05', phone: '' }, 'a')).toEqual([])
  })
})
