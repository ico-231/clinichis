import { DOCTORS, ROOMS, SERVICES } from '../src/store/catalog'
import { DRUGS, INITIAL_PRESCRIPTION_TEMPLATES } from '../src/store/drugCatalog'
import { INITIAL_COMBOS, PARACLINICAL_PROVIDERS, PARACLINICAL_SERVICES, SAMPLE_PROVIDER_ID } from '../src/store/paraclinicalCatalog'
import { INTERNAL_CLS_SEED, seedSchedules } from '../src/store/seedExtras'
import { defaultSystem } from '../src/store/systemDefaults'
import type { ParaclinicalServiceItem } from '../src/store/types'
import { ApiError } from './errors'
import type { Repos } from './repo'

type Item = { id: string } & Record<string, unknown>
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isMoney = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0

/** Kiểm tra từng mục theo loại danh mục; trả về lỗi (rỗng = hợp lệ) */
type Check = (it: Record<string, unknown>) => string | null
const nameRequired: Check = (it) => (text(it.name) ? null : 'Thiếu tên')

/** Danh mục sửa được: mặc định lấy đúng dữ liệu mẫu của 1.0 khi chưa từng lưu */
const EDITABLE: Record<string, { defaults: () => unknown[]; check: Check }> = {
  services: { defaults: () => SERVICES, check: (it) => nameRequired(it) ?? (isMoney(it.price) ? null : 'Giá phải là số nguyên không âm') },
  cls_services: {
    defaults: () => INTERNAL_CLS_SEED,
    check: (it) =>
      nameRequired(it) ??
      (isMoney(it.price) ? null : 'Giá phải là số nguyên không âm') ??
      (it.category === 'imaging' || it.category === 'lab' ? null : 'category: imaging | lab') ??
      (text(it.providerId) ? null : 'Thiếu nơi thực hiện (providerId)'),
  },
  paraclinical_combos: {
    defaults: () => INITIAL_COMBOS,
    check: (it) => nameRequired(it) ?? (Array.isArray(it.items) && it.items.every((x) => isObject(x) && text(x.serviceId)) ? null : 'items: [{ serviceId, quantity }]'),
  },
  prescription_templates: { defaults: () => INITIAL_PRESCRIPTION_TEMPLATES, check: (it) => nameRequired(it) ?? (Array.isArray(it.items) ? null : 'items phải là danh sách') },
  result_templates: { defaults: () => [], check: nameRequired },
}

/** Danh mục chỉ đọc (cố định trong 1.0) */
const READONLY: Record<string, () => unknown[]> = {
  drugs: () => DRUGS,
  providers: () => PARACLINICAL_PROVIDERS,
  doctors: () => DOCTORS,
  rooms: () => ROOMS,
  external_cls: () => PARACLINICAL_SERVICES,
}

/** Cài đặt: khoá hợp lệ và giá trị mặc định khi chưa lưu */
const SETTINGS: Record<string, { defaults: () => unknown; check: (v: unknown) => string | null }> = {
  clinic_profile: { defaults: () => null, check: (v) => (isObject(v) ? null : 'Phải là đối tượng') },
  system: { defaults: defaultSystem, check: (v) => (isObject(v) ? null : 'Phải là đối tượng') },
  schedules: { defaults: seedSchedules, check: (v) => (isObject(v) && Array.isArray(v.fixed) ? null : 'Cần { fixed: [...], leaves, flex }') },
  default_provider_id: { defaults: () => SAMPLE_PROVIDER_ID, check: (v) => (typeof v === 'string' && PARACLINICAL_PROVIDERS.some((p) => p.id === v) ? null : 'Không có nơi thực hiện này') },
}

export const CATALOG_KINDS = [...Object.keys(EDITABLE), ...Object.keys(READONLY)]
export const SETTING_KEYS = Object.keys(SETTINGS)

/** Dịch vụ CLS chỉ định được: danh mục đơn vị bên ngoài (cố định) + lab nội bộ (sửa được); dịch vụ tạm ngưng vẫn trả về để giữ lượt cũ */
export async function orderableClsServices(repos: Repos): Promise<ParaclinicalServiceItem[]> {
  const internal = (await repos.catalog.list<ParaclinicalServiceItem>('cls_services')) ?? INTERNAL_CLS_SEED
  const byId = new Map(PARACLINICAL_SERVICES.map((s) => [s.id, s]))
  for (const s of internal) byId.set(s.id, s)
  return [...byId.values()]
}

export function catalogService(repos: Repos) {
  return {
    async list(kind: string) {
      if (READONLY[kind]) return { kind, editable: false, source: 'default' as const, items: READONLY[kind]() }
      const conf = EDITABLE[kind]
      if (!conf) throw new ApiError('not_found', `Không có danh mục "${kind}"`, { kind: CATALOG_KINDS.join(' | ') })
      const saved = await repos.catalog.list(kind)
      return { kind, editable: true, source: saved ? ('saved' as const) : ('default' as const), items: saved ?? conf.defaults() }
    },

    /** Thay toàn bộ danh mục một loại: { items: [...] } (mỗi mục cần id duy nhất) */
    async replace(kind: string, body: unknown) {
      if (READONLY[kind]) throw new ApiError('conflict', `Danh mục "${kind}" chỉ đọc`)
      const conf = EDITABLE[kind]
      if (!conf) throw new ApiError('not_found', `Không có danh mục "${kind}"`, { kind: CATALOG_KINDS.join(' | ') })
      const items = isObject(body) && Array.isArray(body.items) ? body.items : null
      if (!items) throw new ApiError('validation', 'Cần { items: [...] }', { items: 'Phải là danh sách' })
      const e: Record<string, string> = {}
      const ids = new Set<string>()
      items.forEach((it, i) => {
        if (!isObject(it) || !text(it.id)) return void (e[`items.${i}`] = 'Thiếu id')
        if (ids.has(it.id as string)) return void (e[`items.${i}`] = 'Trùng id')
        ids.add(it.id as string)
        const err = conf.check(it)
        if (err) e[`items.${i}`] = err
      })
      if (Object.keys(e).length) throw new ApiError('validation', 'Danh mục chưa hợp lệ', e)
      return { kind, editable: true, source: 'saved' as const, items: await repos.catalog.replace(kind, items as Item[]) }
    },

    async getSetting(key: string) {
      const conf = SETTINGS[key]
      if (!conf) throw new ApiError('not_found', `Không có cài đặt "${key}"`, { key: SETTING_KEYS.join(' | ') })
      const saved = await repos.settings.get(key)
      return { key, source: saved !== null ? ('saved' as const) : ('default' as const), data: saved ?? conf.defaults() }
    },

    /** Lưu cài đặt: { data } */
    async setSetting(key: string, body: unknown) {
      const conf = SETTINGS[key]
      if (!conf) throw new ApiError('not_found', `Không có cài đặt "${key}"`, { key: SETTING_KEYS.join(' | ') })
      const data = isObject(body) && 'data' in body ? body.data : undefined
      const err = conf.check(data)
      if (err) throw new ApiError('validation', 'Cài đặt chưa hợp lệ', { data: err })
      return { key, source: 'saved' as const, data: await repos.settings.set(key, data) }
    },
  }
}
