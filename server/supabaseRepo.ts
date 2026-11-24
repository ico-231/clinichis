import type { Patient, Visit } from '../src/store/types'
import { ApiError } from './errors'
import type { NewPatient, Repos } from './repo'
import { normalize } from './search'

/* Đổi tên trường giữa JS (camelCase) và Postgres (snake_case), chỉ ở cấp ngoài cùng; jsonb bên trong giữ nguyên */
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
function rowOut<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (v !== null && k !== 'search_key') out[toCamel(k)] = v
  return out as T
}
function rowIn(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnake(k)] = v
  // Cột tìm kiếm không dấu đi theo họ tên
  if (typeof obj.fullName === 'string') out.search_key = normalize(obj.fullName)
  return out
}

/**
 * Kho dữ liệu thật: gọi REST của Supabase (PostgREST) bằng fetch, không cần thư viện.
 * Dùng khoá service role nên CHỈ được chạy phía máy chủ (Vercel Functions).
 */
export function createSupabaseRepos(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Repos {
  const base = `${url.replace(/\/$/, '')}/rest/v1`

  async function call(path: string, init: RequestInit & { prefer?: string } = {}) {
    const res = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(init.prefer ? { Prefer: init.prefer } : {}),
        ...init.headers,
      },
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // 23505 = trùng khoá duy nhất
      if (res.status === 409 || detail.includes('23505')) throw new ApiError('conflict', 'Dữ liệu bị trùng, vui lòng thử lại')
      throw new ApiError('server_error', `Lỗi cơ sở dữ liệu (${res.status})`)
    }
    return res
  }

  return {
    patients: {
      async list({ q, limit, offset }) {
        const params = new URLSearchParams({ select: '*', order: 'created_at.desc,code.desc', limit: String(limit), offset: String(offset) })
        if (q) {
          // Tên so trên cột search_key (đã bỏ dấu); SĐT từ 3 chữ số; mã BN một phần
          const digits = q.replace(/\D/g, '')
          const safe = q.replace(/[,()*%]/g, ' ').trim()
          const ors = [`search_key.ilike.*${normalize(safe)}*`, `code.ilike.*${safe}*`]
          if (digits.length >= 3) ors.push(`phone.ilike.*${digits}*`)
          params.set('or', `(${ors.join(',')})`)
        }
        const res = await call(`/patients?${params}`, { prefer: 'count=exact' })
        const rows = (await res.json()) as Record<string, unknown>[]
        const total = Number(res.headers.get('content-range')?.split('/')[1] ?? rows.length)
        const items = rows.map((r) => rowOut<Patient>(r))
        return { items, total }
      },
      async get(id) {
        const res = await call(`/patients?id=eq.${encodeURIComponent(id)}&select=*`)
        const rows = (await res.json()) as Record<string, unknown>[]
        return rows[0] ? rowOut<Patient>(rows[0]) : null
      },
      async getMany(ids) {
        if (!ids.length) return []
        const list = ids.map((id) => `"${id.replace(/"/g, '')}"`).join(',')
        const res = await call(`/patients?id=in.(${encodeURIComponent(list)})&select=*`)
        return ((await res.json()) as Record<string, unknown>[]).map((r) => rowOut<Patient>(r))
      },
      async create(input: NewPatient) {
        const res = await call('/rpc/create_patient', { method: 'POST', body: JSON.stringify({ payload: rowIn(input as unknown as Record<string, unknown>) }) })
        return rowOut<Patient>((await res.json()) as Record<string, unknown>)
      },
      async update(id, patch) {
        const body = { ...rowIn(patch as Record<string, unknown>), updated_at: new Date().toISOString() }
        const res = await call(`/patients?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body), prefer: 'return=representation' })
        const rows = (await res.json()) as Record<string, unknown>[]
        return rows[0] ? rowOut<Patient>(rows[0]) : null
      },
      async remove(id) {
        const res = await call(`/patients?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=representation' })
        const rows = (await res.json()) as unknown[]
        return rows.length > 0
      },
    },
    visits: {
      async list({ dateFrom, dateTo, status, paymentStatus, patientId }) {
        const params = new URLSearchParams({ select: '*', order: 'date.desc,queue_number.asc' })
        params.append('date', `gte.${dateFrom}`)
        params.append('date', `lte.${dateTo}`)
        if (status) params.set('status', `eq.${status}`)
        if (paymentStatus) params.set('payment_status', `eq.${paymentStatus}`)
        if (patientId) params.set('patient_id', `eq.${patientId}`)
        const res = await call(`/visits?${params}`)
        return ((await res.json()) as Record<string, unknown>[]).map((r) => rowOut<Visit>(r))
      },
      async listByPatient(patientId) {
        const res = await call(`/visits?patient_id=eq.${encodeURIComponent(patientId)}&select=*&order=date.desc`)
        const rows = (await res.json()) as Record<string, unknown>[]
        return rows.map((r) => rowOut<Visit>(r))
      },
      async get(id) {
        const res = await call(`/visits?id=eq.${encodeURIComponent(id)}&select=*`)
        const rows = (await res.json()) as Record<string, unknown>[]
        return rows[0] ? rowOut<Visit>(rows[0]) : null
      },
      async insert(visit) {
        const res = await call('/visits', { method: 'POST', body: JSON.stringify(rowIn(visit as unknown as Record<string, unknown>)), prefer: 'return=representation' })
        return rowOut<Visit>(((await res.json()) as Record<string, unknown>[])[0])
      },
      async update(id, patch) {
        const { id: _i, code: _c, ...rest } = patch
        const res = await call(`/visits?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(rowIn(rest as Record<string, unknown>)), prefer: 'return=representation' })
        const rows = (await res.json()) as Record<string, unknown>[]
        return rows[0] ? rowOut<Visit>(rows[0]) : null
      },
    },
    counters: {
      async next(key, floor = 0) {
        const res = await call('/rpc/bump_counter', { method: 'POST', body: JSON.stringify({ counter_key: key, floor_value: floor }) })
        return Number(await res.json())
      },
    },
    catalog: {
      async list<T extends { id: string }>(kind: string) {
        const res = await call(`/catalog?kind=eq.${encodeURIComponent(kind)}&select=id,data`)
        const rows = (await res.json()) as { id: string; data: T }[]
        if (rows.length) return rows.map((r) => r.data)
        // Không có dòng: phân biệt "chưa lưu" và "đã lưu danh sách rỗng" qua dấu trong settings
        const mark = await call(`/settings?key=eq.${encodeURIComponent(`catalog_saved:${kind}`)}&select=key`)
        return ((await mark.json()) as unknown[]).length ? [] : null
      },
      async replace<T extends { id: string }>(kind: string, items: T[]) {
        // Gọi hàm SQL replace_catalog để xoá + ghi trong một giao dịch
        await call('/rpc/replace_catalog', { method: 'POST', body: JSON.stringify({ catalog_kind: kind, items: items.map((it) => ({ id: it.id, data: it })) }) })
        return items
      },
    },
    settings: {
      async get<T>(key: string) {
        const res = await call(`/settings?key=eq.${encodeURIComponent(key)}&select=data`)
        const rows = (await res.json()) as { data: T }[]
        return rows[0]?.data ?? null
      },
      async set<T>(key: string, data: T) {
        await call('/settings?on_conflict=key', { method: 'POST', body: JSON.stringify({ key, data, updated_at: new Date().toISOString() }), prefer: 'resolution=merge-duplicates' })
        return data
      },
    },
  }
}
