import { Fragment, useMemo, useState } from 'react'
import { Info, ListFilter, Search, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DateRangePicker, presetRange, rangeLabel, type DateRange } from '@/components/ui/DateRangePicker'
import { Drawer } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { isLinePaid } from '@/store/billing'
import { formatDateVN } from '@/lib/date'
import { formatNumber, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useExport } from '../reports/useExport'
import { PERFORM_STATUS, performOf, useOrderGroups, type OrderGroup } from './clsData'
import type { PerformStatus } from '@/store/types'

type Scope = 'all' | 'internal' | 'incoming' | 'outgoing'

/** Cận lâm sàng › Báo cáo doanh thu (ảnh 118–122, 154) */
export function ClsReportPage() {
  const imaging = useOrderGroups('imaging')
  const lab = useOrderGroups('lab')
  const exportCsv = useExport()
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'))
  const [scope, setScope] = useState<Scope>('all')
  const [q, setQ] = useState('')
  const [perform, setPerform] = useState<'all' | PerformStatus>('all')
  const [pay, setPay] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [adv, setAdv] = useState<{ kind: 'all' | 'imaging' | 'lab'; performedAt: 'all' | 'internal' | 'satellite' }>({ kind: 'all', performedAt: 'all' })
  const [advOpen, setAdvOpen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const all = useMemo(() => [...imaging, ...lab].sort((a, b) => b.sentAt.localeCompare(a.sentAt)), [imaging, lab])
  const inScope = useMemo(
    () =>
      all.filter((g) => {
        if (g.visit.date < range.from || g.visit.date > range.to) return false
        if (adv.kind !== 'all' && g.items[0].category !== adv.kind) return false
        if (adv.performedAt !== 'all' && (adv.performedAt === 'internal') !== g.internal) return false
        if (perform !== 'all' && !g.items.some((o) => performOf(o) === perform)) return false
        if (pay !== 'all' && (pay === 'paid') !== g.paid) return false
        if (q && !normalizeText(`${g.code} ${g.patient.fullName} ${g.visit.code}`).includes(normalizeText(q))) return false
        return true
      }),
    [all, range, adv, perform, pay, q],
  )
  // Mọi chỉ định đều phát sinh tại phòng khám: "Nội bộ" = làm tại lab nội bộ, "Gửi ra ngoài" = lab vệ tinh, "Nhận từ ngoài" = 0
  const tabCount = { all: inScope.length, internal: inScope.filter((g) => g.internal).length, incoming: 0, outgoing: inScope.filter((g) => !g.internal).length }
  const rows = inScope.filter((g) => scope === 'all' || (scope === 'internal' ? g.internal : scope === 'outgoing' ? !g.internal : false))
  const discountOf = (g: OrderGroup) =>
    g.visit.payments.flatMap((p) => p.lines ?? []).filter((l) => l.kind === 'paraclinical' && g.items.some((o) => o.id === l.refId)).reduce((s, l) => s + l.discount, 0)
  const stats = {
    orders: inScope.length,
    patients: new Set(inScope.map((g) => g.patient.id)).size,
    internal: inScope.filter((g) => g.internal).reduce((s, g) => s + g.total - discountOf(g), 0),
    outgoing: inScope.filter((g) => !g.internal).reduce((s, g) => s + g.total - discountOf(g), 0),
  }
  const pageCount = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const td = 'border-t border-slate-100 px-2.5 py-2'

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Báo cáo" />
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-slate-900">Doanh thu cận lâm sàng</h2>
          <Button
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() =>
              exportCsv({
                report: 'Doanh thu cận lâm sàng',
                rangeLabel: rangeLabel(range),
                filename: `doanh-thu-cls-${range.from}-${range.to}`,
                header: ['Mã chỉ định', 'Người bệnh', 'Nơi thực hiện', 'Phân loại', 'Ngày chỉ định', 'Thanh toán', 'Tổng tiền dịch vụ', 'Giảm giá', 'Tổng tiền'],
                rows: rows.map((g) => [g.code, g.patient.fullName, g.providerName, g.internal ? 'Nội bộ' : 'Gửi ra ngoài', formatDateVN(g.visit.date), g.paid ? 'Đã thanh toán' : 'Chưa thanh toán', g.total, discountOf(g), g.total - discountOf(g)]),
              })
            }
          >
            Xuất Excel
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Số phiếu chỉ định" value={formatNumber(stats.orders)} />
          <Stat label="Số người bệnh" value={formatNumber(stats.patients)} />
          <Stat label="Doanh thu tại lab nội bộ" value={`${formatNumber(stats.internal)}đ`} />
          <Stat label="Giá trị gửi lab vệ tinh" value={`${formatNumber(stats.outgoing)}đ`} />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm kiếm mã phiếu khám, mã phiếu chỉ định" className="h-9 w-full rounded-md border border-slate-200 pr-3 pl-8 text-[13px] outline-none focus:border-blue-500" />
          </div>
          <DateRangePicker value={range} onChange={(r) => (setRange(r), setPage(1))} />
          <Select
            label="Trạng thái thực hiện"
            value={perform}
            options={[{ value: 'all', label: 'Tất cả' }, ...(['pending', 'in_progress', 'done', 'cancelled'] as PerformStatus[]).map((k) => ({ value: k, label: PERFORM_STATUS[k].label }))]}
            onChange={(v) => (setPerform(v), setPage(1))}
            className="w-[150px]"
          />
          <Select
            label="Trạng thái thanh toán"
            value={pay}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'paid', label: 'Đã thanh toán' },
              { value: 'unpaid', label: 'Chưa thanh toán' },
            ]}
            onChange={(v) => (setPay(v), setPage(1))}
            className="w-[150px]"
          />
          <Button variant="outline" leftIcon={<ListFilter className="h-3.5 w-3.5" />} onClick={() => setAdvOpen(true)}>
            Nâng cao
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              ['all', 'Tất cả'],
              ['internal', 'Nội bộ'],
              ['incoming', 'Nhận từ ngoài'],
              ['outgoing', 'Gửi ra ngoài'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => (setScope(k), setPage(1))} className={cn('rounded-md px-3 py-1 text-[13px]', scope === k ? 'bg-white font-medium shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white')}>
              {l} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[11px]">{tabCount[k]}</span>
            </button>
          ))}
        </div>

        <div className="thin-scroll overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[1100px] text-[13px]">
            <thead className="bg-slate-50 text-[12.5px] text-slate-600">
              <tr>
                {['', 'Mã chỉ định', 'Người bệnh', 'Nơi chỉ định', 'Nơi thực hiện', 'Phân loại', 'Ngày chỉ định', 'Thanh toán', 'Tổng tiền dịch vụ', 'Giảm giá', 'Tổng tiền'].map((h) => (
                  <th key={h} className="px-2.5 py-2 text-left font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <EmptyState />
                  </td>
                </tr>
              )}
              {pageRows.map((g) => (
                <Fragment key={g.key}>
                  <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === g.key ? null : g.key)}>
                    <td className={td}>{open === g.key ? '−' : '+'}</td>
                    <td className={td}>{g.code}</td>
                    <td className={cn(td, 'font-medium uppercase')}>{g.patient.fullName}</td>
                    <td className={td}>Nội bộ</td>
                    <td className={td}>{g.internal ? 'Tại phòng lab nội bộ' : g.providerName}</td>
                    <td className={td}>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11.5px]', g.internal ? 'bg-slate-100 text-slate-700' : 'bg-violet-50 text-violet-700')}>{g.internal ? 'Nội bộ' : 'Gửi ra ngoài'}</span>
                    </td>
                    <td className={td}>{formatDateVN(g.visit.date)}</td>
                    <td className={cn(td, g.paid ? 'text-emerald-700' : 'text-orange-700')}>{g.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{formatNumber(g.total)}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{formatNumber(discountOf(g))}</td>
                    <td className={cn(td, 'text-right font-semibold tabular-nums')}>{formatNumber(g.total - discountOf(g))}</td>
                  </tr>
                  {open === g.key &&
                    g.items.map((o) => (
                      <tr key={o.id} className="bg-slate-50/70 text-[12.5px]">
                        <td className={td} />
                        <td className={td} colSpan={4}>
                          {o.name} <span className="text-slate-500">× {o.quantity}</span>
                        </td>
                        <td className={td}>{o.category === 'imaging' ? 'CĐHA' : 'Xét nghiệm'}</td>
                        <td className={td}>{PERFORM_STATUS[performOf(o)].label}</td>
                        <td className={td}>{isLinePaid(g.visit, { kind: 'paraclinical', refId: o.id }) ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
                        <td className={cn(td, 'text-right tabular-nums')} colSpan={3}>
                          {formatNumber(o.unitPrice * o.quantity)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
      </div>

      {advOpen && (
        <Drawer open onClose={() => setAdvOpen(false)} title="Tìm kiếm nâng cao">
          <AdvancedForm value={adv} onApply={(v) => (setAdv(v), setPage(1), setAdvOpen(false))} />
        </Drawer>
      )}
    </div>
  )
}

function AdvancedForm({ value, onApply }: { value: { kind: 'all' | 'imaging' | 'lab'; performedAt: 'all' | 'internal' | 'satellite' }; onApply: (v: typeof value) => void }) {
  const [d, setD] = useState(value)
  const group = <K extends keyof typeof d>(k: K, title: string, opts: [(typeof d)[K], string][]) => (
    <fieldset>
      <legend className="mb-1 text-[13px] font-semibold">{title}</legend>
      {opts.map(([v, l]) => (
        <label key={String(v)} className="flex items-center gap-2 py-0.5 text-[13px]">
          <input type="radio" name={String(k)} checked={d[k] === v} onChange={() => setD((x) => ({ ...x, [k]: v }))} className="accent-blue-600" />
          {l}
        </label>
      ))}
    </fieldset>
  )
  return (
    <div className="space-y-4 px-4 py-3">
      {group('kind', 'Loại chỉ định', [
        ['all', 'Tất cả'],
        ['imaging', 'Chẩn đoán hình ảnh'],
        ['lab', 'Xét nghiệm'],
      ])}
      {group('performedAt', 'Nơi thực hiện', [
        ['all', 'Tất cả'],
        ['internal', 'Tại phòng lab nội bộ'],
        ['satellite', 'Tại phòng lab vệ tinh'],
      ])}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onApply({ kind: 'all', performedAt: 'all' })}>
          Đặt lại
        </Button>
        <Button onClick={() => onApply(d)}>Áp dụng</Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-1 text-[12.5px] text-slate-600">
        {label} <Info className="h-3 w-3 text-slate-400" />
      </p>
      <p className="text-[19px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}
