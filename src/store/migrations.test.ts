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
})
