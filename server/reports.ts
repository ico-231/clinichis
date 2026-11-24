import { isVoidOrder, remainingAmount } from '../src/store/billing.js'
import { serviceById } from '../src/store/catalog.js'
import { addDays } from '../src/lib/date.js'
import type { PaymentMethod, Visit, VisitStatus } from '../src/store/types.js'
import { ApiError } from './errors.js'
import type { Repos } from './repo.js'
import { isISODate, todayVN } from './time.js'

const isDate = isISODate
/** Lượt "đến khám" = đã tiếp nhận trở đi, không tính huỷ (như reportData.ts của 1.0) */
const attended = (v: Visit) => v.status === 'waiting' || v.status === 'in_progress' || v.status === 'done'
/** Phiếu thu có thể thu sau ngày khám: quét lùi thêm chừng này ngày để không sót tiền thu trong kỳ */
const LOOKBACK_DAYS = 90

export function reportService(repos: Repos, opts: { clock?: () => Date } = {}) {
  const clock = opts.clock ?? (() => new Date())

  return {
    /**
     * Tổng hợp kỳ báo cáo: lượt khám theo trạng thái, khách mới/cũ, doanh thu theo ngày thu (giờ VN) và hình thức,
     * hoàn tiền, giảm giá, còn phải thu, theo ngày, dịch vụ khám và CLS nhiều nhất.
     */
    async summary(params: { dateFrom?: string; dateTo?: string }) {
      const today = todayVN(clock())
      const dateFrom = params.dateFrom || today
      const dateTo = params.dateTo || dateFrom
      if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) throw new ApiError('validation', 'Khoảng ngày không hợp lệ', { dateFrom: 'YYYY-MM-DD, từ ngày ≤ đến ngày' })
      if (Date.parse(dateTo) - Date.parse(dateFrom) > 366 * 86_400_000) throw new ApiError('validation', 'Kỳ báo cáo tối đa 1 năm')

      const scanned = await repos.visits.list({ dateFrom: addDays(dateFrom, -LOOKBACK_DAYS), dateTo })
      const inPeriod = scanned.filter((v) => v.date >= dateFrom && v.date <= dateTo)

      const byStatus: Record<VisitStatus, number> = { registered: 0, waiting: 0, in_progress: 0, done: 0, cancelled: 0 }
      for (const v of inPeriod) byStatus[v.status] += 1
      const came = inPeriod.filter(attended)

      const byMethod: Record<PaymentMethod, number> = { cash: 0, transfer: 0, card: 0, ewallet: 0 }
      const days = new Map<string, { date: string; visits: number; attended: number; revenue: number }>()
      for (let d = dateFrom; d <= dateTo; d = addDays(d, 1)) days.set(d, { date: d, visits: 0, attended: 0, revenue: 0 })
      for (const v of inPeriod) {
        const row = days.get(v.date)!
        row.visits += 1
        if (attended(v)) row.attended += 1
      }

      let collected = 0
      let refunds = 0
      let discount = 0
      let receipts = 0
      for (const v of scanned) {
        for (const p of v.payments) {
          const day = todayVN(new Date(p.at))
          if (day < dateFrom || day > dateTo) continue
          if (p.kind === 'payment') {
            collected += p.amount
            receipts += 1
            byMethod[p.method] += p.amount
            discount += (p.discount ?? 0) + (p.lines ?? []).reduce((s, l) => s + l.discount, 0)
            days.get(day)!.revenue += p.amount
          } else {
            refunds += p.amount
            days.get(day)!.revenue -= p.amount
          }
        }
      }

      const services = new Map<string, { id: string; name: string; count: number }>()
      for (const v of came) {
        const s = services.get(v.serviceId) ?? { id: v.serviceId, name: serviceById(v.serviceId)?.name ?? v.serviceId, count: 0 }
        s.count += 1
        services.set(v.serviceId, s)
      }
      const cls = new Map<string, { serviceId: string; name: string; count: number; amount: number }>()
      for (const v of inPeriod) {
        if (v.status === 'cancelled') continue
        for (const o of v.paraclinicalOrders ?? []) {
          if (isVoidOrder(o)) continue
          const c = cls.get(o.serviceId) ?? { serviceId: o.serviceId, name: o.name, count: 0, amount: 0 }
          c.count += o.quantity
          c.amount += o.unitPrice * o.quantity
          cls.set(o.serviceId, c)
        }
      }

      return {
        dateFrom,
        dateTo,
        visits: {
          total: inPeriod.length,
          attended: came.length,
          byStatus,
          newPatients: came.filter((v) => v.patientType === 'new').length,
          returningPatients: came.filter((v) => v.patientType === 'returning').length,
        },
        revenue: { collected, refunds, net: collected - refunds, discount, receipts, byMethod, outstanding: came.reduce((s, v) => s + remainingAmount(v), 0) },
        byDay: [...days.values()],
        topServices: [...services.values()].sort((a, b) => b.count - a.count).slice(0, 10),
        topParaclinical: [...cls.values()].sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 10),
      }
    },
  }
}
