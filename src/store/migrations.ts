import { INITIAL_PRESCRIPTION_TEMPLATES } from './drugCatalog'
import { INTERNAL_CLS_SEED, seedSchedules } from './seedExtras'
import { STATE_VERSION } from './seed'
import { defaultSystem } from './systemDefaults'
import { ROOMS } from './catalog'
import type { ClinicState, SystemSettings } from './types'

type AnyState = Record<string, unknown> & { version?: unknown }

/** Mỗi bước nâng cấp từ phiên bản n lên n + 1, giữ nguyên người bệnh / lượt khám */
const STEPS: Record<number, (s: AnyState) => AnyState> = {
  // v2 → v3: bổ sung danh mục CLS nội bộ, lịch làm việc, cấu hình hệ thống
  2: (s) => ({
    ...s,
    version: 3,
    clsServices: s.clsServices ?? INTERNAL_CLS_SEED,
    schedules: s.schedules ?? seedSchedules(),
    system: s.system ?? defaultSystem(),
    prescriptionTemplates: s.prescriptionTemplates ?? INITIAL_PRESCRIPTION_TEMPLATES,
  }),
  // v3 → v4: phòng ở Cơ cấu tổ chức dùng chung mã với danh mục phòng (rmN → rN, bổ sung phòng còn thiếu)
  3: (s) => {
    const system = s.system as SystemSettings | undefined
    if (!system?.org?.rooms) return { ...s, version: 4 }
    const rooms = system.org.rooms.map((r) => (/^rm\d+$/.test(r.id) ? { ...r, id: `r${r.id.slice(2)}` } : r))
    for (const base of ROOMS) if (!rooms.some((r) => r.id === base.id)) rooms.push({ id: base.id, name: base.name, description: base.floor, updatedAt: '' })
    return { ...s, version: 4, system: { ...system, org: { ...system.org, rooms } } }
  },
}

export const BACKUP_PREFIX = 'clinic-his:backup-v'

/**
 * Nâng cấp dữ liệu đã lưu lên STATE_VERSION. Trả về null nếu không nâng cấp được
 * (khi đó dữ liệu gốc được sao lưu sang khoá clinic-his:backup-v<n> để không mất).
 */
export function migrateState(raw: unknown, backup: (key: string, value: string) => void = () => {}): ClinicState | null {
  if (!raw || typeof raw !== 'object') return null
  let s = raw as AnyState
  const from = typeof s.version === 'number' ? s.version : 0
  if (from === STATE_VERSION) return s as unknown as ClinicState
  if (from > STATE_VERSION || !STEPS[from]) {
    backup(`${BACKUP_PREFIX}${from}`, JSON.stringify(raw))
    return null
  }
  for (let v = from; v < STATE_VERSION; v++) {
    const step = STEPS[v]
    if (!step) {
      backup(`${BACKUP_PREFIX}${from}`, JSON.stringify(raw))
      return null
    }
    s = step(s)
  }
  if (!Array.isArray(s.patients) || !Array.isArray(s.visits)) return null
  return s as unknown as ClinicState
}
