import type { Patient, Visit } from '../src/store/types.js'
import type { NewPatient, Repos } from './repo.js'
import { matchesPatient } from './search.js'

/**
 * Kho dữ liệu trong bộ nhớ: dùng cho test và chạy thử khi chưa có Supabase (CLINIC_DATA=memory).
 * Mỗi lần khởi động lại là mất dữ liệu.
 */
export function createMemoryRepos(seed: { patients?: Patient[]; visits?: Visit[] } = {}): Repos {
  const patients = new Map((seed.patients ?? []).map((p) => [p.id, structuredClone(p)]))
  const visits = new Map((seed.visits ?? []).map((v) => [v.id, structuredClone(v)]))
  const counters = new Map<string, number>()
  const catalog = new Map<string, unknown[]>()
  const settings = new Map<string, unknown>()
  let seq = 0
  const uid = (prefix: string) => `${prefix}_mem${(++seq).toString(36)}${Date.now().toString(36)}`

  const nextCode = () => {
    const max = [...patients.values()].reduce((m, p) => Math.max(m, Number(p.code.replace(/\D/g, '')) || 0), 0)
    return `BN${String(max + 1).padStart(6, '0')}`
  }

  return {
    patients: {
      async list({ q, limit, offset }) {
        const all = [...patients.values()]
          .filter((p) => !q || matchesPatient(p, q))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code))
        return { items: all.slice(offset, offset + limit).map((p) => structuredClone(p)), total: all.length }
      },
      async get(id) {
        const p = patients.get(id)
        return p ? structuredClone(p) : null
      },
      async getMany(ids) {
        return ids.map((id) => patients.get(id)).filter((p): p is Patient => !!p).map((p) => structuredClone(p))
      },
      async create(input: NewPatient) {
        const now = new Date().toISOString()
        const patient: Patient = { ...structuredClone(input), id: uid('p'), code: nextCode(), createdAt: now, updatedAt: now }
        patients.set(patient.id, patient)
        return structuredClone(patient)
      },
      async update(id, patch) {
        const p = patients.get(id)
        if (!p) return null
        const next: Patient = { ...p, ...structuredClone(patch), id: p.id, code: p.code, createdAt: p.createdAt, updatedAt: new Date().toISOString() }
        patients.set(id, next)
        return structuredClone(next)
      },
      async remove(id) {
        if (!patients.delete(id)) return false
        // Giống ON DELETE CASCADE của bảng visits
        for (const [vid, v] of visits) if (v.patientId === id) visits.delete(vid)
        return true
      },
    },
    visits: {
      async list({ dateFrom, dateTo, status, paymentStatus, patientId }) {
        return [...visits.values()]
          .filter((v) => v.date >= dateFrom && v.date <= dateTo)
          .filter((v) => (!status || v.status === status) && (!paymentStatus || v.paymentStatus === paymentStatus) && (!patientId || v.patientId === patientId))
          .map((v) => structuredClone(v))
      },
      async listByPatient(patientId) {
        return [...visits.values()].filter((v) => v.patientId === patientId).map((v) => structuredClone(v))
      },
      async get(id) {
        const v = visits.get(id)
        return v ? structuredClone(v) : null
      },
      async insert(visit) {
        if ([...visits.values()].some((v) => v.code === visit.code || (v.date === visit.date && v.queueNumber === visit.queueNumber))) {
          throw new Error('duplicate visit code/queue')
        }
        visits.set(visit.id, structuredClone(visit))
        return structuredClone(visit)
      },
      async update(id, patch) {
        const v = visits.get(id)
        if (!v) return null
        const next = { ...v, ...structuredClone(patch), id: v.id, code: v.code }
        visits.set(id, next)
        return structuredClone(next)
      },
    },
    counters: {
      async next(key, floor = 0) {
        const value = Math.max(counters.get(key) ?? 0, floor) + 1
        counters.set(key, value)
        return value
      },
    },
    catalog: {
      async list<T extends { id: string }>(kind: string) {
        const items = catalog.get(kind)
        return items ? (structuredClone(items) as T[]) : null
      },
      async replace<T extends { id: string }>(kind: string, items: T[]) {
        catalog.set(kind, structuredClone(items))
        return structuredClone(items)
      },
    },
    settings: {
      async get<T>(key: string) {
        return settings.has(key) ? (structuredClone(settings.get(key)) as T) : null
      },
      async set<T>(key: string, data: T) {
        settings.set(key, structuredClone(data))
        return structuredClone(data)
      },
    },
  }
}
