import { addDays, ageInYears, parseISODate, toISODate } from '@/lib/date'
import { lineNet } from '@/store/billing'
import type { PaymentMethod, Patient, Visit } from '@/store/types'

/** Ngày địa phương (YYYY-MM-DD) của một ISO datetime */
export const localDate = (iso: string) => toISODate(new Date(iso))

export const inRange = (d: string, from: string, to: string) => d >= from && d <= to

/** Lượt "đến khám" = đã tiếp nhận trở đi, không tính huỷ */
export const isAttended = (v: Visit) => v.status === 'waiting' || v.status === 'in_progress' || v.status === 'done'

export function daysBetween(from: string, to: string) {
  const out: string[] = []
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}

export const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export interface DayPoint {
  date: string
  label: string
  old: number
  new: number
  visits: number
}

/** Chuỗi theo ngày: người bệnh mới / cũ (đếm người, không trùng trong ngày) và tổng lượt khám */
export function dailyAttendance(visits: Visit[], from: string, to: string): DayPoint[] {
  return daysBetween(from, to).map((date) => {
    const day = visits.filter((v) => v.date === date && isAttended(v))
    const pts = new Map<string, Visit['patientType']>()
    day.forEach((v) => pts.set(v.patientId, pts.get(v.patientId) === 'new' ? 'new' : v.patientType))
    const vals = [...pts.values()]
    return { date, label: dayLabel(date), old: vals.filter((t) => t === 'returning').length, new: vals.filter((t) => t === 'new').length, visits: day.length }
  })
}

export interface RevenueEntry {
  visit: Visit
  date: string
  at: string
  kind: 'payment' | 'refund'
  amount: number
  consultation: number
  paraclinical: number
  discount: number
  method: PaymentMethod
  code?: string
  cashier?: string
}

/** Mọi khoản thu / hoàn (theo ngày thu thực tế) */
export function revenueEntries(visits: Visit[]): RevenueEntry[] {
  const out: RevenueEntry[] = []
  for (const v of visits) {
    // Tỉ lệ công khám / CLS đã thu của lượt, dùng để chia khoản hoàn tiền cho đúng từng phần
    let paidCk = 0
    let paidCls = 0
    for (const p of v.payments) {
      if (p.kind !== 'payment') continue
      const ls = p.lines ?? []
      if (!ls.length) {
        paidCk += p.amount
        continue
      }
      const ck = Math.max(ls.filter((l) => l.kind === 'consultation').reduce((s, l) => s + lineNet(l), 0) - (p.discount ?? 0), 0)
      paidCk += ck
      paidCls += p.amount - ck
    }
    const ckShare = paidCk + paidCls > 0 ? paidCk / (paidCk + paidCls) : 1
    for (const p of v.payments) {
      const lines = p.lines ?? []
      const ck = lines.filter((l) => l.kind === 'consultation').reduce((s, l) => s + lineNet(l), 0)
      const cls = lines.filter((l) => l.kind === 'paraclinical').reduce((s, l) => s + lineNet(l), 0)
      const discount = (p.discount ?? 0) + lines.reduce((s, l) => s + l.discount, 0)
      // phiếu cũ không có dòng: tính vào công khám
      const consultation = lines.length ? Math.max(ck - (p.discount ?? 0), 0) : p.amount
      out.push({
        visit: v,
        date: localDate(p.at),
        at: p.at,
        kind: p.kind,
        amount: p.amount,
        consultation: p.kind === 'refund' ? -Math.round(p.amount * ckShare) : consultation,
        paraclinical: p.kind === 'refund' ? -(p.amount - Math.round(p.amount * ckShare)) : lines.length ? p.amount - consultation : 0,
        discount,
        method: p.method,
        code: p.code,
        cashier: p.cashier,
      })
    }
  }
  return out
}

export const netOf = (e: RevenueEntry) => (e.kind === 'payment' ? e.amount : -e.amount)

export type AgeGroup = 'newborn' | 'child' | 'teen' | 'adult' | 'senior'
export const AGE_GROUP_LABEL: Record<AgeGroup, string> = { newborn: 'Sơ sinh', child: 'Trẻ em', teen: 'Vị thành niên', adult: 'Trưởng thành', senior: 'Cao tuổi' }

export function ageGroupOf(p: Patient, ref: string): AgeGroup {
  const days = (parseISODate(ref).getTime() - parseISODate(p.dob).getTime()) / 86_400_000
  if (days < 28) return 'newborn'
  const y = ageInYears(p.dob, ref)
  if (y < 10) return 'child'
  if (y < 19) return 'teen'
  if (y < 60) return 'adult'
  return 'senior'
}

/** Kỳ so sánh liền trước có cùng độ dài */
export function previousRange(from: string, to: string) {
  const len = daysBetween(from, to).length
  return { from: addDays(from, -len), to: addDays(from, -1) }
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

export function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>()
  items.forEach((i) => m.set(key(i), (m.get(key(i)) ?? 0) + 1))
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}
