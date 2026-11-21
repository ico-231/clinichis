import { CLINIC, ROOMS, SERVICES } from './catalog'
import { RUNTIME } from './runtime'
import { PARACLINICAL_SERVICES } from './paraclinicalCatalog'
import type { ClinicProfile, ParaclinicalServiceItem, Service, SystemSettings } from './types'

const BASE_SERVICES = [...SERVICES]
const BASE_CLS = [...PARACLINICAL_SERVICES]
export const INTERNAL_LAB_ID = 'lab_internal'

let lastServices: Service[] | undefined
let lastCls: ParaclinicalServiceItem[] | undefined

/**
 * Đồng bộ danh mục do người dùng chỉnh (Tiền công khám, Danh mục CLS nội bộ) vào các mảng
 * danh mục dùng chung (SERVICES, PARACLINICAL_SERVICES) để mọi màn hình đọc cùng một nguồn.
 * Thay đổi tại chỗ (in-place) nên các import hiện có không cần sửa. Gọi lại an toàn (idempotent).
 */
export function syncCatalogs(services?: Service[], cls?: ParaclinicalServiceItem[]) {
  if (services !== lastServices) {
    SERVICES.splice(0, SERVICES.length, ...(services ?? BASE_SERVICES))
    lastServices = services
  }
  if (cls !== lastCls) {
    const internal = cls ?? BASE_CLS.filter((s) => s.providerId === INTERNAL_LAB_ID)
    PARACLINICAL_SERVICES.splice(0, PARACLINICAL_SERVICES.length, ...internal.filter((s) => !s.paused), ...BASE_CLS.filter((s) => s.providerId !== INTERNAL_LAB_ID))
    lastCls = cls
  }
}

const BASE_CLINIC = { ...CLINIC }
const BASE_ROOMS = [...ROOMS]
let lastRooms: SystemSettings['org']['rooms'] | undefined

/** Phòng ở Hệ thống › Cơ cấu tổ chức là nguồn của danh mục phòng (tên phòng trên phiếu, danh sách) */
function syncRooms(rooms?: SystemSettings['org']['rooms']) {
  if (rooms === lastRooms) return
  lastRooms = rooms
  const next = rooms?.length ? rooms.map((r) => ({ id: r.id, name: r.name, floor: BASE_ROOMS.find((b) => b.id === r.id)?.floor ?? '' })) : BASE_ROOMS
  ROOMS.splice(0, ROOMS.length, ...next)
}

/** Đồng bộ tên người dùng, tiền tố mã, thông tin phòng khám (dùng trên bản in) */
export function syncRuntime(system?: SystemSettings, profile?: ClinicProfile) {
  RUNTIME.userName = system ? `${system.account.lastName} ${system.account.firstName}`.trim() : 'Nguyễn Đắc Nghĩa'
  RUNTIME.codePrefix = system?.general.codePrefix.trim().toUpperCase() || 'YMD'
  RUNTIME.seqDigits = Math.min(10, Math.max(3, (system?.general.codeMinLength ?? 8) - 1))
  CLINIC.name = profile?.clinicName || BASE_CLINIC.name
  CLINIC.address = profile ? [profile.address, profile.ward, profile.province].filter(Boolean).join(', ') : BASE_CLINIC.address
  CLINIC.hotline = profile?.phone || BASE_CLINIC.hotline
  syncRooms(system?.org.rooms)
}
