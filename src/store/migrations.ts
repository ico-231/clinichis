import { INITIAL_PRESCRIPTION_TEMPLATES } from './drugCatalog'
import { INTERNAL_CLS_SEED, seedSchedules } from './seedExtras'
import { STATE_VERSION } from './seed'
import { defaultSystem } from './systemDefaults'
import { ROOMS } from './catalog'
import type { ClinicState, SystemSettings } from './types'

/** v5 → v6: địa chỉ / số điện thoại phòng khám mẫu trùng cơ sở y tế thật => đổi sang địa chỉ minh hoạ */
const CLINIC_RENAMES: [string, string][] = [
  ['215 Hồng Bàng, P. 11, Q. 5, TP. Hồ Chí Minh', '18 Đường số 3, Khu phố 5, TP. Hồ Chí Minh'],
  ['245 Hồng Bàng, P. 11, Q. 5, TP.HCM', '27 Đường số 8, Khu phố 2, TP.HCM'],
  ['1900 6868', '0123 456 789'],
  ['19006868', '0123456789'],
]

/** Thay chuỗi trong toàn bộ dữ liệu đã lưu (JSON) */
function replaceInState(s: AnyState, pairs: [string, string][], exact: (from: string) => boolean = () => false): AnyState {
  let json = JSON.stringify(s)
  for (const [from, to] of pairs) {
    const [a, b] = exact(from) ? [JSON.stringify(from), JSON.stringify(to)] : [JSON.stringify(from).slice(1, -1), JSON.stringify(to).slice(1, -1)]
    json = json.split(a).join(b)
  }
  return JSON.parse(json) as AnyState
}

/** v4 → v5: đơn vị CLS bên ngoài đổi sang tên giả (mã, tên, địa chỉ) */
const PROVIDER_RENAMES: [string, string][] = [
  ['lab_medlatec_qn', 'lab_an_binh'],
  ['Phòng xét nghiệm MEDLATEC Quy Nhơn - Bình Định số 28', 'Trung tâm Xét nghiệm An Bình - Chi nhánh số 3'],
  ['553 Nguyễn Thái Học, Phường Quy Nhơn Nam, Tỉnh Gia Lai', '12 Đường số 7, Khu dân cư Ánh Dương, Tỉnh Gia Lai'],
  ['Khu 2 Thanh Lũng, Xã Quảng Oai, TP Hà Nội', 'Tầng 2 - Phòng khám Nhi Khoa'],
  ['lab_pk_minh', 'lab_hoa_sen'],
  ['PK BS Minh Test', 'Phòng khám Đa khoa Hoa Sen'],
  ['3/1 Thành Thái, Phường Hòa Hưng, Thành phố Hồ Chí Minh', '48 Đường số 2, Khu phố Hoa Sen, Thành phố Hồ Chí Minh'],
  ['lab_ung_buou_ct', 'lab_tan_phat'],
  ['Y KHOA UNG BƯỚU CẦN THƠ', 'Trung tâm Y khoa Tân Phát'],
  ['NS10, ĐƯỜNG SỐ 5, Phường Long Tuyến, Thành phố Cần Thơ', 'Lô B5, Đường số 9, Khu đô thị Tân Phát, Thành phố Cần Thơ'],
  ['lab_open_hc', 'lab_viet_an'],
  ['Phòng xét nghiệm trực thuộc Công ty Cổ Phần Open Healthcare Việt Nam', 'Phòng xét nghiệm Việt An - Công ty CP Xét nghiệm Việt An'],
  ['Tầng 2 - Toà nhà Huyndai, số 987 Tam Trinh, Phường Hoàng Mai, Thành phố Hà Nội', 'Tầng 3 - Toà nhà Việt An, số 21 Đường số 4, Thành phố Hà Nội'],
  ['lab_ck_ung_buou_ct', 'lab_minh_tam'],
  ['Phòng Xét Nghiệm Chuyên Khoa Ung Bướu Cần Thơ', 'Phòng xét nghiệm chuyên khoa Minh Tâm'],
  ['Số 10 đường số 5, khu dân cư Mặt Trời Đỏ, tổ 17, khu vực Bình Thường B, TP. Cần Thơ', 'Số 7 Đường số 3, Khu dân cư Minh Tâm, Thành phố Cần Thơ'],
]

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
  // v4 → v5: thay mã / tên / địa chỉ đơn vị CLS thật bằng tên giả ở mọi chỗ đã lưu (chỉ định, combo, cài đặt)
  // Mã đơn vị (lab_…) chỉ thay khi khớp nguyên giá trị; tên / địa chỉ thay cả khi nằm trong chuỗi ghép (vd. mô tả phiếu)
  4: (s) => ({ ...replaceInState(s, PROVIDER_RENAMES, (from) => from.startsWith('lab_')), version: 5 }),
  // v5 → v6: địa chỉ / số điện thoại phòng khám mẫu
  5: (s) => ({ ...replaceInState(s, CLINIC_RENAMES), version: 6 }),
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
