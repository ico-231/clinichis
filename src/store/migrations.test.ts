import { describe, expect, it, vi } from 'vitest'
import { migrateState } from './migrations'
import { STATE_VERSION } from './seed'

describe('migrateState', () => {
  const v2 = { version: 2, patients: [{ id: 'p1' }], visits: [{ id: 'v1' }], paraclinicalCombos: [], defaultProviderId: 'lab_internal', ui: {} }

  it('nâng cấp v2 lên phiên bản hiện tại, giữ nguyên người bệnh và lượt khám', () => {
    const out = migrateState(v2)!
    expect(out.version).toBe(STATE_VERSION)
    expect(out.patients).toEqual(v2.patients)
    expect(out.visits).toEqual(v2.visits)
    expect(out.clsServices?.length).toBeGreaterThan(0)
    expect(out.schedules?.fixed.length).toBeGreaterThan(0)
    expect(out.system?.general.codePrefix).toBe('YMD')
  })

  it('không ghi đè dữ liệu người dùng đã có', () => {
    const out = migrateState({ ...v2, clsServices: [{ id: 'mine' }] })!
    expect(out.clsServices).toEqual([{ id: 'mine' }])
  })

  it('phiên bản lạ: sao lưu dữ liệu gốc và trả về null', () => {
    const backup = vi.fn()
    expect(migrateState({ version: 99, patients: [], visits: [] }, backup)).toBeNull()
    expect(backup).toHaveBeenCalledWith('clinic-his:backup-v99', expect.any(String))
    expect(migrateState({ version: 1 }, backup)).toBeNull()
  })

  it('dữ liệu hỏng trả về null', () => {
    expect(migrateState(null)).toBeNull()
    expect(migrateState('x')).toBeNull()
  })

  it('v3 → v4: phòng cơ cấu tổ chức đổi sang mã danh mục, giữ tên đã sửa', () => {
    const v3 = migrateState({ ...v2, version: 3, system: { org: { rooms: [{ id: 'rm1', name: 'Phòng Nhi số 1', description: '', updatedAt: '' }] } } })!
    const rooms = v3.system!.org.rooms
    expect(rooms[0]).toMatchObject({ id: 'r1', name: 'Phòng Nhi số 1' })
    expect(rooms.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
  })

  it('v4 → v5: đơn vị CLS thật đổi sang tên giả, giữ nguyên dữ liệu khác', () => {
    const order = { providerId: 'lab_medlatec_qn', providerName: 'Phòng xét nghiệm MEDLATEC Quy Nhơn - Bình Định số 28', providerAddress: '553 Nguyễn Thái Học, Phường Quy Nhơn Nam, Tỉnh Gia Lai', serviceId: 'cls_m10' }
    const v4 = { ...v2, version: 4, visits: [{ id: 'v1', orders: [order], note: 'Gửi PK BS Minh Test, lab_pk_minh_x' }], paraclinicalCombos: [{ id: 'c1', providerId: 'lab_ck_ung_buou_ct' }] }
    const out = migrateState(v4)! as unknown as typeof v4
    expect(out.version).toBe(5)
    expect(out.visits[0].orders[0]).toEqual({ providerId: 'lab_an_binh', providerName: 'Trung tâm Xét nghiệm An Bình - Chi nhánh số 3', providerAddress: '12 Đường số 7, Khu dân cư Ánh Dương, Tỉnh Gia Lai', serviceId: 'cls_m10' })
    // tên trong chuỗi ghép được thay; mã chỉ thay khi khớp nguyên giá trị
    expect(out.visits[0].note).toBe('Gửi Phòng khám Đa khoa Hoa Sen, lab_pk_minh_x')
    expect(out.paraclinicalCombos[0].providerId).toBe('lab_minh_tam')
    expect(JSON.stringify(out)).not.toMatch(/MEDLATEC|Ung Bướu|Open Healthcare/i)
  })
})
