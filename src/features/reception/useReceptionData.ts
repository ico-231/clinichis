import { useMemo } from 'react'
import { useClinicState, paidAmount } from '@/store/ClinicStore'
import { useVisitRows, type VisitRow } from '@/store/selectors'
import { normalizeText } from '@/lib/format'
import { RECEPTION_COLUMNS } from './columns'
import type { ReceptionFilters, Visit, VisitStatus } from '@/store/types'

function matches(row: VisitRow, f: ReceptionFilters, ignoreStatus = false) {
  const { visit: v, patient: p } = row
  if (v.date < f.dateFrom || v.date > f.dateTo) return false
  if (!ignoreStatus && f.status !== 'all' && v.status !== f.status) return false
  if (f.payment !== 'all' && v.paymentStatus !== f.payment) return false
  if (f.category !== 'all' && v.category !== f.category) return false
  if (f.source !== 'all' && v.source !== f.source) return false
  if (f.doctorId !== 'all' && v.doctorId !== f.doctorId) return false
  if (f.roomId !== 'all' && v.roomId !== f.roomId) return false
  if (f.patientType !== 'all' && v.patientType !== f.patientType) return false
  const q = normalizeText(f.search)
  if (q) {
    const digits = q.replace(/\D/g, '')
    const haystack = normalizeText(`${p.fullName} ${p.code} ${v.code} ${p.guardianName ?? ''}`)
    const phoneHit = digits.length >= 3 && p.phone.includes(digits)
    if (!haystack.includes(q) && !phoneHit) return false
  }
  return true
}

/**
 * Trả về bộ lọc đã nới tối thiểu để lượt khám `v` chắc chắn hiện trong danh sách:
 * mở rộng khoảng ngày, bỏ các tiêu chí đang loại trừ lượt này và xoá từ khoá tìm kiếm.
 * Trả về null nếu bộ lọc hiện tại đã hiển thị được lượt này (trừ phần tìm kiếm).
 */
export function filtersRevealingVisit(f: ReceptionFilters, v: Visit): ReceptionFilters | null {
  const next: ReceptionFilters = {
    ...f,
    dateFrom: v.date < f.dateFrom ? v.date : f.dateFrom,
    dateTo: v.date > f.dateTo ? v.date : f.dateTo,
    status: f.status !== 'all' && f.status !== v.status ? 'all' : f.status,
    payment: f.payment !== 'all' && f.payment !== v.paymentStatus ? 'all' : f.payment,
    category: f.category !== 'all' && f.category !== v.category ? 'all' : f.category,
    source: f.source !== 'all' && f.source !== v.source ? 'all' : f.source,
    doctorId: f.doctorId !== 'all' && f.doctorId !== v.doctorId ? 'all' : f.doctorId,
    roomId: f.roomId !== 'all' && f.roomId !== v.roomId ? 'all' : f.roomId,
    patientType: f.patientType !== 'all' && f.patientType !== v.patientType ? 'all' : f.patientType,
    search: '',
  }
  const changed = (Object.keys(next) as (keyof ReceptionFilters)[]).some((k) => next[k] !== f[k])
  return changed ? next : null
}

export function useReceptionData() {
  const rows = useVisitRows()
  const { ui } = useClinicState()
  const view = ui.reception
  const { filters, sort, pageSize } = view

  return useMemo(() => {
    const scoped = rows.filter((r) => matches(r, filters, true))
    const filtered = filters.status === 'all' ? scoped : scoped.filter((r) => r.visit.status === filters.status)

    const col = sort ? RECEPTION_COLUMNS.find((c) => c.key === sort.key) : null
    const sorted = [...filtered].sort((a, b) => {
      if (col?.sortValue) {
        const av = col.sortValue(a)
        const bv = col.sortValue(b)
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'vi')
        if (cmp !== 0) return sort!.direction === 'asc' ? cmp : -cmp
      }
      // mặc định: ngày khám mới nhất trước, trong ngày theo STT
      return b.visit.date.localeCompare(a.visit.date) || a.visit.queueNumber - b.visit.queueNumber
    })

    const pageCount = Math.ceil(sorted.length / pageSize)
    const page = Math.min(Math.max(view.page, 1), Math.max(pageCount, 1))
    const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

    const statusCounts = scoped.reduce(
      (acc, r) => {
        acc[r.visit.status] += 1
        return acc
      },
      { registered: 0, waiting: 0, in_progress: 0, done: 0, cancelled: 0 } as Record<VisitStatus, number>,
    )

    const active = filtered.filter((r) => r.visit.status !== 'cancelled')
    const collected = filtered.reduce((s, r) => s + paidAmount(r.visit), 0)
    const outstanding = active.reduce((s, r) => s + Math.max(r.visit.fee - paidAmount(r.visit), 0), 0)

    return { scopedTotal: scoped.length, sorted, pageRows, page, pageCount, statusCounts, collected, outstanding }
  }, [rows, filters, sort, pageSize, view.page])
}
