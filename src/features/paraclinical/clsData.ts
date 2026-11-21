import { useMemo } from 'react'
import { useVisitRows } from '@/store/selectors'
import { isLinePaid } from '@/store/billing'
import { providerById } from '@/store/paraclinicalCatalog'
import type { ParaclinicalOrderItem, Patient, PerformStatus, Visit } from '@/store/types'

type Tone = 'orange' | 'blue' | 'green' | 'gray' | 'red'

export const PERFORM_STATUS: Record<PerformStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Chờ thực hiện', tone: 'orange' },
  in_progress: { label: 'Đang thực hiện', tone: 'blue' },
  done: { label: 'Hoàn thành', tone: 'green' },
  cancelled: { label: 'Đã huỷ', tone: 'gray' },
  no_show: { label: 'NB không đến', tone: 'gray' },
}

export type ResultFilter = 'waiting' | 'has_result' | 'none' | 'processing'
export const RESULT_FILTER_LABEL: Record<ResultFilter, string> = {
  waiting: 'Chờ kết quả',
  has_result: 'Có kết quả',
  none: 'Không trả kết quả',
  processing: 'Đang xử lý',
}

export const performOf = (o: ParaclinicalOrderItem): PerformStatus => o.performStatus ?? 'pending'

/** Trạng thái trả kết quả của một chỉ định (dùng cho bộ lọc) */
export function resultStateOf(o: ParaclinicalOrderItem): ResultFilter {
  if (o.resultStatus === 'has_result') return 'has_result'
  if (performOf(o) === 'cancelled' || performOf(o) === 'no_show') return 'none'
  if (performOf(o) === 'in_progress') return 'processing'
  return 'waiting'
}

/** Gộp trạng thái thực hiện của cả phiếu */
export function groupPerform(items: ParaclinicalOrderItem[]): PerformStatus {
  const st = items.map(performOf)
  const active = st.filter((s) => s !== 'cancelled' && s !== 'no_show')
  if (!active.length) return st.includes('no_show') ? 'no_show' : 'cancelled'
  if (active.every((s) => s === 'done')) return 'done'
  if (active.some((s) => s === 'in_progress' || s === 'done')) return 'in_progress'
  return 'pending'
}

/** Một phiếu chỉ định = các chỉ định cùng lượt khám, cùng loại, cùng nơi thực hiện */
export interface OrderGroup {
  key: string
  code: string
  visit: Visit
  patient: Patient
  providerId: string
  providerName: string
  providerAddress: string
  internal: boolean
  items: ParaclinicalOrderItem[]
  total: number
  paid: boolean
  perform: PerformStatus
  sentAt: string
}

export function useOrderGroups(category: 'imaging' | 'lab') {
  const rows = useVisitRows()
  return useMemo(() => {
    const groups: OrderGroup[] = []
    for (const { visit, patient } of rows) {
      if (visit.status === 'cancelled') continue
      const sent = (visit.paraclinicalOrders ?? []).filter((o) => o.category === category && o.sentAt)
      const byProvider = new Map<string, ParaclinicalOrderItem[]>()
      sent.forEach((o) => byProvider.set(o.providerId, [...(byProvider.get(o.providerId) ?? []), o]))
      ;[...byProvider.entries()].forEach(([providerId, items], i) => {
        const p = providerById(providerId)
        groups.push({
          key: `${visit.id}:${category}:${providerId}`,
          code: `I${visit.code.slice(3)}${i > 0 ? `-${i + 1}` : ''}`,
          visit,
          patient,
          providerId,
          providerName: items[0].providerName,
          providerAddress: items[0].providerAddress,
          internal: Boolean(p?.isInternal),
          items,
          total: items.reduce((s, o) => s + o.unitPrice * o.quantity, 0),
          paid: items.every((o) => isLinePaid(visit, { kind: 'paraclinical', refId: o.id })),
          perform: groupPerform(items),
          sentAt: items.map((o) => o.sentAt!).sort()[0],
        })
      })
    }
    return groups.sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  }, [rows, category])
}
