import { describe, expect, it } from 'vitest'
import { INITIAL_PRESCRIPTION_TEMPLATES, allergyConflict, drugById } from './drugCatalog'
import { createSeedState } from './seed'

describe('Cảnh báo dị ứng thuốc', () => {
  const para = drugById('dr02')!
  const amox = drugById('dr06')!
  const augmentin = drugById('dr07')!
  const azi = drugById('dr09')!

  it('trùng hoạt chất (bỏ dấu, không phân biệt hoa thường, có ghi chú kèm)', () => {
    expect(allergyConflict(para, 'Paracetamol (nổi mề đay)')).toBe(true)
    expect(allergyConflict(amox, 'amoxicillin')).toBe(true)
    expect(allergyConflict(augmentin, 'Amoxicillin')).toBe(true)
  })

  it('dị ứng nhóm: Penicillin ⇒ cảnh báo Amoxicillin', () => {
    expect(allergyConflict(amox, 'Penicillin')).toBe(true)
    expect(allergyConflict(azi, 'Penicillin')).toBe(false)
  })

  it('không báo nhầm khi dị ứng thức ăn / không có ghi chú', () => {
    expect(allergyConflict(para, 'Hải sản')).toBe(false)
    expect(allergyConflict(amox, 'Đạm sữa bò')).toBe(false)
    expect(allergyConflict(para, '')).toBe(false)
    expect(allergyConflict(para, undefined)).toBe(false)
  })
})

describe('Đơn mẫu và dữ liệu mẫu', () => {
  it('lọ nhỏ mũi trong đơn mẫu cấp 1 lọ, liều tính bằng giọt', () => {
    const saline = INITIAL_PRESCRIPTION_TEMPLATES.flatMap((t) => t.items).filter((i) => i.drugId === 'dr21')
    expect(saline.length).toBeGreaterThan(0)
    for (const i of saline) {
      expect(i.quantity).toBe(1)
      expect(i.quantityUnit).toBe('Lọ')
      expect(i.doseUnit).toBe('Giọt')
    }
  })

  it('không lượt khám mẫu nào kê thuốc bé đã dị ứng; lượt đã khám có cân nặng, chiều cao', () => {
    const state = createSeedState()
    const byId = new Map(state.patients.map((p) => [p.id, p]))
    const done = state.visits.filter((v) => v.status === 'done' && v.exam)
    expect(done.length).toBeGreaterThan(10)
    for (const v of done) {
      const allergies = byId.get(v.patientId)?.allergies ?? ''
      for (const rx of v.exam!.prescription) expect(allergyConflict(rx, allergies), `${v.code} kê ${rx.name} cho bé dị ứng ${allergies}`).toBe(false)
      if (allergies) expect(v.exam!.allergyNote).toBe(allergies)
      expect(Number(v.vitals?.weightKg)).toBeGreaterThan(2)
      expect(Number(v.vitals?.heightCm)).toBeGreaterThan(40)
    }
  })
})
