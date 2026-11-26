import { Fragment, useMemo, useState } from 'react'
import { RowToggle } from '@/components/ui/RowToggle'
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
  const td = 'border-t border-line-soft px-3 py-2.5'

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader
        title="Báo cáo cận lâm sàng"
        subtitle="Doanh thu theo phiếu chỉ định cận lâm sàng"
        actions={
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
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
        }
      />
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1920px] space-y-3.5 px-4 sm:px-6 2xl:px-8 pt-1 pb-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Số phiếu chỉ định" value={formatNumber(stats.orders)} />
            <Stat label="Số người bệnh" value={formatNumber(stats.patients)} />
            <Stat label="Doanh thu tại lab nội bộ" value={`${formatNumber(stats.internal)}đ`} accent="teal" />
            <Stat label="Giá trị gửi lab vệ tinh" value={`${formatNumber(stats.outgoing)}đ`} accent="coral" />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                value={q}
                onChange={(e) => (setQ(e.target.value), setPage(1))}
                placeholder="Tìm kiếm mã phiếu khám, mã phiếu chỉ định"
                aria-label="Tìm kiếm mã phiếu khám, mã phiếu chỉ định"
                className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <DateRangePicker value={range} onChange={(r) => (setRange(r), setPage(1))} />
            <Select
              label="Trạng thái thực hiện"
              value={perform}
              options={[{ value: 'all', label: 'Tất cả' }, ...(['pending', 'in_progress', 'done', 'cancelled'] as PerformStatus[]).map((k) => ({ value: k, label: PERFORM_STATUS[k].label }))]}
              onChange={(v) => (setPerform(v), setPage(1))}
              className="w-[155px]"
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
              className="w-[160px]"
            />
            <Button variant="outline" leftIcon={<ListFilter className="h-3.5 w-3.5" />} onClick={() => setAdvOpen(true)} className={cn((adv.kind !== 'all' || adv.performedAt !== 'all') && 'border-brand bg-brand-tint text-brand-ink')}>
              Nâng cao
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'Tất cả'],
                ['internal', 'Nội bộ'],
                ['incoming', 'Nhận từ ngoài'],
                ['outgoing', 'Gửi ra ngoài'],
              ] as const
            ).map(([k, l]) => {
              const active = scope === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => (setScope(k), setPage(1))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                    active ? 'border-brand bg-brand text-white shadow-xs' : 'border-line bg-surface text-ink-2 hover:border-brand/40 hover:text-brand-ink',
                  )}
                >
                  <span>{l}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums', active ? 'bg-surface/20 text-white' : 'bg-subtle text-ink-3')}>{tabCount[k]}</span>
                </button>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[1100px] text-[13px]">
                <thead className="border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
                  <tr>
                    {['', 'Mã chỉ định', 'Người bệnh', 'Nơi chỉ định', 'Nơi thực hiện', 'Phân loại', 'Ngày chỉ định', 'Thanh toán', 'Tổng tiền dịch vụ', 'Giảm giá', 'Tổng tiền'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
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
                      <tr className="cursor-pointer transition-colors hover:bg-brand-wash" onClick={() => setOpen(open === g.key ? null : g.key)}>
                        <td className={td}>
                          <RowToggle open={open === g.key} onToggle={() => setOpen(open === g.key ? null : g.key)} label={`chi tiết ${g.code}`} />
                        </td>
                        <td className={cn(td, 'font-semibold text-info-ink tabular-nums')}>{g.code}</td>
                        <td className={cn(td, 'font-semibold text-ink uppercase')}>{g.patient.fullName}</td>
                        <td className={cn(td, 'text-ink-2')}>Nội bộ</td>
                        <td className={cn(td, 'text-ink-2')}>{g.internal ? 'Tại phòng lab nội bộ' : g.providerName}</td>
                        <td className={td}>
                          <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold', g.internal ? 'bg-subtle text-ink-2' : 'bg-accent-soft text-accent-strong')}>
                            {g.internal ? 'Nội bộ' : 'Gửi ra ngoài'}
                          </span>
                        </td>
                        <td className={cn(td, 'text-ink-2 tabular-nums')}>{formatDateVN(g.visit.date)}</td>
                        <td className={cn(td, 'font-medium', g.paid ? 'text-brand-ink' : 'text-accent-ink')}>{g.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
                        <td className={cn(td, 'text-right text-ink-2 tabular-nums')}>{formatNumber(g.total)}</td>
                        <td className={cn(td, 'text-right text-ink-2 tabular-nums')}>{formatNumber(discountOf(g))}</td>
                        <td className={cn(td, 'text-right font-semibold text-ink tabular-nums')}>{formatNumber(g.total - discountOf(g))}</td>
                      </tr>
                      {open === g.key &&
                        g.items.map((o) => (
                          <tr key={o.id} className="bg-canvas text-[12.5px]">
                            <td className={td} />
                            <td className={cn(td, 'font-medium text-ink')} colSpan={4}>
                              {o.name} <span className="text-ink-3 tabular-nums">× {o.quantity}</span>
                            </td>
                            <td className={cn(td, 'text-ink-2')}>{o.category === 'imaging' ? 'CĐHA' : 'Xét nghiệm'}</td>
                            <td className={cn(td, 'text-ink-2')}>{PERFORM_STATUS[performOf(o)].label}</td>
                            <td className={cn(td, 'font-medium', isLinePaid(g.visit, { kind: 'paraclinical', refId: o.id }) ? 'text-brand-ink' : 'text-accent-ink')}>
                              {isLinePaid(g.visit, { kind: 'paraclinical', refId: o.id }) ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </td>
                            <td className={cn(td, 'text-right font-medium text-ink tabular-nums')} colSpan={3}>
                              {formatNumber(o.unitPrice * o.quantity)}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4">
              <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
            </div>
          </div>
        </div>
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
      <legend className="mb-1.5 text-[13px] font-semibold text-ink">{title}</legend>
      {opts.map(([v, l]) => (
        <label key={String(v)} className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-ink-2">
          <input type="radio" name={String(k)} checked={d[k] === v} onChange={() => setD((x) => ({ ...x, [k]: v }))} className="accent-brand" />
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

function Stat({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'teal' | 'coral' }) {
  return (
    <div className="rounded-[16px] border border-line bg-surface px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3">
        {label} <Info className="h-3.5 w-3.5 text-ink-4" />
      </p>
      <p className={cn('mt-1 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums', accent === 'teal' ? 'text-brand-ink' : accent === 'coral' ? 'text-accent-ink' : 'text-ink')}>
        {value}
      </p>
    </div>
  )
}
