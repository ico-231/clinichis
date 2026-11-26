import { useMemo, useState, type ReactNode } from 'react'
import { Download, Info, MoreHorizontal, Printer, Receipt, RotateCw, Search, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DateRangePicker, presetRange, rangeLabel, type DateRange } from '@/components/ui/DateRangePicker'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { Donut, HBars, MiniArea, SERIES, StackedBarLine, CATEGORICAL } from '@/components/charts/Charts'
import { useClinicState } from '@/store/ClinicStore'
import { useVisitRows } from '@/store/selectors'
import { DOCTORS, doctorLabel, GENDER_LABEL, PAYMENT_METHOD_LABEL } from '@/store/catalog'
import { billableLines, clsCharge, isLinePaid } from '@/store/billing'
import { ICD10 } from '@/store/icd10'
import { addDays, ageInYears, formatDateTimeVN, formatDateVN, todayISO } from '@/lib/date'
import { formatNumber, formatPhone, normalizeText } from '@/lib/format'
import { downloadText } from '@/lib/csv'
import { cn } from '@/lib/cn'
import { ReceiptModal } from '../billing/ReceiptModal'
import { LegendRow } from '../dashboard/DashboardPage'
import { AGE_GROUP_LABEL, ageGroupOf, countBy, localDate, dailyAttendance, inRange, isAttended, netOf, pctChange, previousRange, revenueEntries, type AgeGroup } from './reportData'
import { useExport } from './useExport'
import type { PaymentMethod } from '@/store/types'

type ReportKey = 'overview' | 'sales' | 'icd' | 'unpaid' | 'reconcile' | 'invoices' | 'newExam' | 'exam' | 'book' | 'downloads'

const MENU: { key: ReportKey; label: string; ready: boolean }[] = [
  { key: 'overview', label: 'Báo cáo tổng quan', ready: true },
  { key: 'sales', label: 'Doanh thu bán hàng', ready: true },
  { key: 'icd', label: 'Chẩn đoán ICD', ready: true },
  { key: 'unpaid', label: 'Dịch vụ chưa thu', ready: true },
  { key: 'reconcile', label: 'Đối soát thanh toán', ready: false },
  { key: 'invoices', label: 'Hoá đơn phòng khám', ready: true },
  { key: 'newExam', label: 'Báo cáo khám mới', ready: false },
  { key: 'exam', label: 'Báo cáo khám bệnh', ready: true },
  { key: 'book', label: 'Sổ khám bệnh', ready: true },
  { key: 'downloads', label: 'Lịch sử tải về', ready: true },
]

/** Quản lý › Báo cáo (ảnh 133–153) */
export function ReportsPage() {
  const [key, setKey] = useState<ReportKey>('overview')
  const item = MENU.find((m) => m.key === key)!
  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title={item.label} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 gap-4 overflow-hidden px-4 sm:px-6 2xl:px-8 pt-1 pb-4 max-md:flex-col">
        {/* Màn hẹp: danh mục thành thanh tab cuộn ngang phía trên */}
        <nav
          className="thin-scroll shrink-0 rounded-[16px] border border-line bg-surface p-2 text-[13px] max-md:flex max-md:gap-1 max-md:overflow-x-auto md:w-[210px] md:space-y-0.5"
          aria-label="Danh mục báo cáo"
        >
          {MENU.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setKey(m.key)}
              className={cn(
                'rounded-[10px] px-3 py-2 text-left transition-colors max-md:shrink-0 max-md:whitespace-nowrap md:w-full',
                key === m.key ? 'bg-brand-soft font-semibold text-brand-ink' : 'font-medium text-ink-2 hover:bg-canvas hover:text-ink',
              )}
            >
              {m.label}
            </button>
          ))}
        </nav>
        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto pr-0.5">
          {key === 'overview' && <OverviewReport />}
          {key === 'sales' && <SalesReport />}
          {key === 'icd' && <IcdReport />}
          {key === 'unpaid' && <UnpaidReport />}
          {key === 'invoices' && <InvoicesReport />}
          {key === 'exam' && <ExamReport />}
          {key === 'book' && <ExamBook />}
          {key === 'downloads' && <DownloadHistory />}
          {!item.ready && (
            <div className="flex h-full items-center justify-center rounded-[16px] border border-line bg-surface">
              <EmptyState title={`${item.label} đang chờ thiết kế`} description="Chưa có ảnh tham chiếu cho báo cáo này – giữ trang chờ theo kế hoạch." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Khung dùng chung                                                    */
/* ------------------------------------------------------------------ */

function Card({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[16px] border border-line bg-surface p-4', className)}>
      {(title || right) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[14.5px] font-bold text-ink">{title}</p>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="rounded-[16px] border border-line bg-surface px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3">
        {label}
        {hint && <Info className="h-3.5 w-3.5 text-ink-4" aria-label={hint} />}
      </p>
      <p className={cn('mt-1 text-[21px] font-extrabold tracking-[-0.02em] tabular-nums', accent ?? 'text-ink')}>{value}</p>
    </div>
  )
}

function Table({ head, children, minWidth = 760 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-[14px] border border-line bg-surface">
      <table className="w-full text-[13px]" style={{ minWidth }}>
        <thead className="border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const td = 'border-t border-line-soft px-3 py-2.5'
const tdR = cn(td, 'text-right tabular-nums')

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-end gap-2 pt-1.5">{children}</div>
}

function DateBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <DatePicker label={label} value={value} onChange={onChange} className="w-[160px]" />
}

function ExportBtn({ onClick, label = 'Xuất Excel' }: { onClick: () => void; label?: string }) {
  return (
    <Button variant={label === 'Xuất Excel' ? 'primary' : 'outline'} leftIcon={label === 'Xuất Excel' ? <Upload className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />} onClick={onClick} className="ml-auto">
      {label}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Báo cáo tổng quan (133–136)                                         */
/* ------------------------------------------------------------------ */

function OverviewReport() {
  const { visits, patients } = useClinicState()
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'))
  const [freqMonths, setFreqMonths] = useState<'3' | '6' | '12'>('6')
  const d = useMemo(() => {
    const att = visits.filter((v) => isAttended(v) && inRange(v.date, range.from, range.to))
    const byId = new Map(patients.map((p) => [p.id, p]))
    const pids = [...new Set(att.map((v) => v.patientId))]
    const pts = pids.map((id) => byId.get(id)!).filter(Boolean)
    const newIds = new Set(att.filter((v) => v.patientType === 'new').map((v) => v.patientId))
    const rev = revenueEntries(visits).filter((e) => inRange(e.date, range.from, range.to))
    const revenue = rev.reduce((s, e) => s + netOf(e), 0)
    const prev = previousRange(range.from, range.to)
    const prevAtt = visits.filter((v) => isAttended(v) && inRange(v.date, prev.from, prev.to))
    const prevPts = new Set(prevAtt.map((v) => v.patientId)).size
    const prevRev = revenueEntries(visits).filter((e) => inRange(e.date, prev.from, prev.to)).reduce((s, e) => s + netOf(e), 0)
    const months = Number(freqMonths)
    const monthly = Array.from({ length: months }, (_, i) => {
      const dt = new Date(range.to)
      dt.setDate(1)
      dt.setMonth(dt.getMonth() - (months - 1 - i))
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      return visits.filter((v) => isAttended(v) && v.date.startsWith(key)).length
    })
    const groups = (Object.keys(AGE_GROUP_LABEL) as AgeGroup[]).map((g) => ({ g, value: pts.filter((p) => ageGroupOf(p, range.to) === g).length }))
    return {
      series: dailyAttendance(visits, range.from, range.to),
      total: pts.length,
      newCount: pts.filter((p) => newIds.has(p.id)).length,
      oldCount: pts.filter((p) => !newIds.has(p.id)).length,
      avgVisits: pts.length ? att.length / pts.length : 0,
      prevAvgVisits: prevPts ? prevAtt.length / prevPts : 0,
      avgSpend: pts.length ? revenue / pts.length : 0,
      prevAvgSpend: prevPts ? prevRev / prevPts : 0,
      monthly,
      male: pts.filter((p) => p.gender === 'male').length,
      female: pts.filter((p) => p.gender === 'female').length,
      groups,
      cls: countBy(att.flatMap((v) => (v.paraclinicalOrders ?? []).filter((o) => o.sentAt)), (o) => o.name).slice(0, 6),
      drugs: countBy(att.flatMap((v) => v.exam?.prescription ?? []), (i) => i.name).slice(0, 6),
    }
  }, [visits, patients, range, freqMonths])

  const change = (cur: number, prev: number) => {
    // Kỳ trước không có số liệu thì không so sánh được (tránh "▲ 100%" gây hiểu nhầm)
    if (!prev) return <span className="text-[11.5px] text-ink-4">Kỳ trước chưa có số liệu</span>
    const p = pctChange(cur, prev)
    return <span className={cn('text-[11.5px] font-medium tabular-nums', p >= 0 ? 'text-brand-ink' : 'text-accent-ink')}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% so với cùng kỳ</span>
  }

  return (
    <div className="space-y-3.5">
      <div className="flex justify-end">
        <DateRangePicker value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(
          [
            ['Tổng người bệnh', d.total, 'var(--chart-info)', d.series.map((x) => x.old + x.new)],
            ['Khách hàng mới', d.newCount, 'var(--chart-new)', d.series.map((x) => x.new)],
            ['Khách hàng cũ', d.oldCount, 'var(--chart-visits)', d.series.map((x) => x.old)],
          ] as const
        ).map(([t, v, c, vals]) => (
          <Card key={t} title={t} right={<b className="text-[18px] font-extrabold text-ink tabular-nums">{formatNumber(v)}</b>}>
            <MiniArea values={[...vals]} color={c} label={`${t} theo ngày`} />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Lượt người bệnh đến khám">
          <StackedBarLine data={d.series} />
          <div className="mt-2">
            <LegendRow />
          </div>
        </Card>
        <Card title="Tỉ lệ khách mới/cũ">
          <Donut
            label="Tỉ lệ người bệnh mới và cũ"
            slices={[
              { label: 'Người bệnh mới', value: d.newCount, color: SERIES.new },
              { label: 'Người bệnh cũ', value: d.oldCount, color: SERIES.old },
            ]}
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Card
          title="Tần suất & tỉ lệ giữ khách"
          right={
            <select value={freqMonths} onChange={(e) => setFreqMonths(e.target.value as '3' | '6' | '12')} className="h-8 rounded-[10px] border border-line-strong bg-surface px-2.5 text-[12.5px] font-medium text-ink outline-none focus:border-brand" aria-label="Khoảng thời gian">
              <option value="3">3 tháng</option>
              <option value="6">6 tháng</option>
              <option value="12">12 tháng</option>
            </select>
          }
        >
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <p className="text-ink-3">Số lần khám trung bình</p>
              <p className="text-[18px] font-bold text-ink tabular-nums">
                {d.avgVisits.toFixed(2)} <span className="text-[12px] font-medium text-brand-ink">lần/người bệnh</span>
              </p>
              {change(d.avgVisits, d.prevAvgVisits)}
            </div>
            <div>
              <p className="text-ink-3">Số tiền chi trả trung bình</p>
              <p className="text-[18px] font-bold text-ink tabular-nums">{formatNumber(Math.round(d.avgSpend))}</p>
              {change(d.avgSpend, d.prevAvgSpend)}
            </div>
          </div>
          <MiniArea values={d.monthly} color={SERIES.visits} label="Lượt khám theo tháng" />
        </Card>
        <Card title="Giới tính">
          <Donut
            size={150}
            label="Tỉ lệ người bệnh theo giới tính"
            slices={[
              { label: 'Nam', value: d.male, color: CATEGORICAL[0] },
              { label: 'Nữ', value: d.female, color: CATEGORICAL[4] },
            ]}
          />
        </Card>
        <Card title="Độ tuổi">
          <Donut size={150} label="Tỉ lệ người bệnh theo độ tuổi" slices={d.groups.map((g, i) => ({ label: AGE_GROUP_LABEL[g.g], value: g.value, color: CATEGORICAL[i] }))} />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Các loại CLS phổ biến">
          <HBars items={d.cls} />
        </Card>
        <Card title="Các loại thuốc phổ biến được kê">
          <HBars items={d.drugs} color={SERIES.new} />
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Doanh thu bán hàng (135, 137–140)                                   */
/* ------------------------------------------------------------------ */

function SalesReport() {
  const { visits } = useClinicState()
  const exportCsv = useExport()
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'))
  const [method, setMethod] = useState<'all' | PaymentMethod>('all')
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => {
    const rev = revenueEntries(visits).filter((e) => inRange(e.date, range.from, range.to) && (method === 'all' || e.method === method))
    const byDay = new Map<string, typeof rev>()
    rev.forEach((e) => byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]))
    return [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => {
        const gross = list.filter((e) => e.kind === 'payment').reduce((s, e) => s + e.amount + e.discount, 0)
        const discount = list.reduce((s, e) => s + (e.kind === 'payment' ? e.discount : 0), 0)
        const refund = list.filter((e) => e.kind === 'refund').reduce((s, e) => s + e.amount, 0)
        return { date, list, count: list.filter((e) => e.kind === 'payment').length, gross, discount, refund, net: gross - discount - refund }
      })
  }, [visits, range, method])
  const sum = (k: 'count' | 'gross' | 'discount' | 'net') => rows.reduce((s, r) => s + r[k], 0)

  return (
    <>
      <Toolbar>
        <div>
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Loại kỳ báo cáo</span>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <Select label="Phạm vi doanh thu" value="clinic" options={[{ value: 'clinic', label: 'Phòng khám' }]} onChange={() => {}} className="w-[150px]" />
        <Select
          label="Phương thức thanh toán"
          value={method}
          options={[{ value: 'all', label: 'Tất cả' }, ...(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))]}
          onChange={setMethod}
          className="w-[170px]"
        />
        <ExportBtn
          onClick={() =>
            exportCsv({
              report: 'Doanh thu bán hàng',
              rangeLabel: `${formatDateVN(range.from)} - ${formatDateVN(range.to)}`,
              filename: `doanh-thu-${range.from}-${range.to}`,
              header: ['Ngày', 'Số đơn bán', 'Doanh thu gốc', 'Giảm giá', 'Hoàn tiền', 'Doanh thu thuần'],
              rows: rows.map((r) => [formatDateVN(r.date), r.count, r.gross, r.discount, r.refund, r.net]),
            })
          }
        />
      </Toolbar>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tổng số đơn bán" value={formatNumber(sum('count'))} hint="Số phiếu thu trong kỳ" />
        <Stat label="Doanh thu gốc" value={`${formatNumber(sum('gross'))}đ`} hint="Trước giảm giá" />
        <Stat label="Giảm giá" value={`${formatNumber(sum('discount'))}đ`} accent="text-accent-ink" />
        <Stat label="Doanh thu thuần" value={`${formatNumber(sum('net'))}đ`} accent="text-brand-ink" hint="Sau giảm giá và hoàn tiền" />
      </div>
      <Card title="Doanh thu theo ngày">
        <Table head={['', 'Thời gian', 'Số đơn bán', 'Phòng khám', 'Doanh thu gốc', 'Giảm giá', 'Hoàn tiền', 'Doanh thu thuần']}>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8}>
                <EmptyState />
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <FragmentRows key={r.date}>
              <tr className="cursor-pointer transition-colors hover:bg-brand-wash" onClick={() => setOpen(open === r.date ? null : r.date)}>
                <td className={cn(td, 'font-semibold text-ink-3')}>{open === r.date ? '−' : '+'}</td>
                <td className={cn(td, 'font-medium text-ink tabular-nums')}>{formatDateVN(r.date)}</td>
                <td className={tdR}>{r.count}</td>
                <td className={tdR}>{formatNumber(r.gross)}</td>
                <td className={tdR}>{formatNumber(r.gross)}</td>
                <td className={cn(tdR, 'font-medium text-accent-ink')}>{formatNumber(r.discount)}</td>
                <td className={tdR}>{formatNumber(r.refund)}</td>
                <td className={cn(tdR, 'font-semibold text-brand-ink')}>{formatNumber(r.net)}</td>
              </tr>
              {open === r.date &&
                r.list.map((e, i) => (
                  <tr key={i} className="bg-canvas text-[12.5px]">
                    <td className={td} />
                    <td className={cn(td, 'font-medium text-ink tabular-nums')} colSpan={2}>
                      {e.code ?? '—'} · {e.visit.code}
                    </td>
                    <td className={cn(td, 'text-ink-3')} colSpan={2}>
                      {e.kind === 'refund' ? 'Hoàn tiền' : PAYMENT_METHOD_LABEL[e.method]} · {formatDateTimeVN(e.at)}
                    </td>
                    <td className={tdR}>{formatNumber(e.discount)}</td>
                    <td className={tdR}>{e.kind === 'refund' ? formatNumber(e.amount) : 0}</td>
                    <td className={cn(tdR, 'font-medium text-ink')}>{formatNumber(netOf(e))}</td>
                  </tr>
                ))}
            </FragmentRows>
          ))}
          {rows.length > 0 && (
            <tr className="bg-canvas/70 font-semibold">
              <td className={td} />
              <td className={td}>Tổng cộng</td>
              <td className={tdR}>{sum('count')}</td>
              <td className={tdR}>{formatNumber(sum('gross'))}</td>
              <td className={tdR}>{formatNumber(sum('gross'))}</td>
              <td className={cn(tdR, 'text-accent-ink')}>{formatNumber(sum('discount'))}</td>
              <td className={tdR}>{formatNumber(rows.reduce((s, r) => s + r.refund, 0))}</td>
              <td className={cn(tdR, 'text-brand-ink')}>{formatNumber(sum('net'))}</td>
            </tr>
          )}
        </Table>
      </Card>
    </>
  )
}

function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/* Chẩn đoán ICD (141)                                                 */
/* ------------------------------------------------------------------ */

function IcdReport() {
  const { visits } = useClinicState()
  const exportCsv = useExport()
  const [from, setFrom] = useState(() => addDays(todayISO(), -29))
  const [to, setTo] = useState(todayISO)
  const [q, setQ] = useState('')
  const [code, setCode] = useState('all')
  const [kind, setKind] = useState<'all' | 'main' | 'side'>('all')
  const rows = useMemo(() => {
    const list = visits
      .filter((v) => v.status === 'done' && inRange(v.date, from, to))
      .flatMap((v) => (v.exam?.diagnoses ?? []).map((d, i) => ({ d, main: i === 0 })))
      .filter((x) => kind === 'all' || (kind === 'main') === x.main)
      .filter((x) => code === 'all' || x.d.code === code)
      .filter((x) => !q || normalizeText(`${x.d.code} ${x.d.name}`).includes(normalizeText(q)))
    return countBy(list, (x) => (x.d.code ? `${x.d.code} – ${x.d.name}` : x.d.name))
  }, [visits, from, to, q, code, kind])
  return (
    <>
      <Toolbar>
        <DateBox label="Từ ngày" value={from} onChange={setFrom} />
        <DateBox label="Đến ngày" value={to} onChange={setTo} />
        <TextField label="Tên chẩn đoán" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên chẩn đoán" wrapperClassName="w-[220px]" />
        <Select label="ICD-10" value={code} options={[{ value: 'all', label: 'Lọc theo mã ICD' }, ...ICD10.map((d) => ({ value: d.code, label: `${d.code} – ${d.name}` }))]} onChange={setCode} className="w-[200px]" menuMinWidth={360} />
        <Select
          label="Loại chẩn đoán"
          value={kind}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'main', label: 'Bệnh chính' },
            { value: 'side', label: 'Bệnh kèm theo' },
          ]}
          onChange={setKind}
          className="w-[140px]"
        />
        <ExportBtn
          label="Tải về"
          onClick={() =>
            exportCsv({
              report: 'Chẩn đoán ICD',
              rangeLabel: `${formatDateVN(from)} - ${formatDateVN(to)}`,
              filename: `chan-doan-icd-${from}-${to}`,
              header: ['#', 'Tên chẩn đoán', 'Số lượng'],
              rows: rows.map((r, i) => [i + 1, r.label, r.value]),
            })
          }
        />
      </Toolbar>
      <Table head={['#', 'Tên chẩn đoán', 'Số lượng']} minWidth={600}>
        {rows.length === 0 && (
          <tr>
            <td colSpan={3}>
              <EmptyState />
            </td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={r.label}>
            <td className={td}>{i + 1}</td>
            <td className={td}>{r.label}</td>
            <td className={tdR}>{r.value}</td>
          </tr>
        ))}
      </Table>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Dịch vụ chưa thu (142)                                              */
/* ------------------------------------------------------------------ */

function UnpaidReport() {
  const rows = useVisitRows()
  const exportCsv = useExport()
  const [from, setFrom] = useState(() => addDays(todayISO(), -6))
  const [to, setTo] = useState(todayISO)
  const [doctor, setDoctor] = useState('all')
  const groups = useMemo(() => {
    const items = rows
      .filter(({ visit: v }) => isAttended(v) && inRange(v.date, from, to) && (doctor === 'all' || v.doctorId === doctor))
      .flatMap(({ visit, patient }) => billableLines(visit).filter((l) => l.unitPrice > 0 && !isLinePaid(visit, l)).map((l) => ({ visit, patient, line: l })))
    const byDate = new Map<string, typeof items>()
    items.forEach((x) => byDate.set(x.visit.date, [...(byDate.get(x.visit.date) ?? []), x]))
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows, from, to, doctor])
  const total = groups.reduce((s, [, l]) => s + l.reduce((a, x) => a + x.line.unitPrice * x.line.quantity, 0), 0)
  return (
    <>
      <Toolbar>
        <DateBox label="Từ ngày" value={from} onChange={setFrom} />
        <DateBox label="Đến ngày" value={to} onChange={setTo} />
        <Select label="Bác sĩ" value={doctor} options={[{ value: 'all', label: 'Tất cả' }, ...DOCTORS.map((d) => ({ value: d.id, label: `${d.title} ${d.name}` }))]} onChange={setDoctor} className="w-[200px]" />
        <ExportBtn
          label="Tải về"
          onClick={() =>
            exportCsv({
              report: 'Dịch vụ chưa thu',
              rangeLabel: `${formatDateVN(from)} - ${formatDateVN(to)}`,
              filename: `dich-vu-chua-thu-${from}-${to}`,
              header: ['Ngày', 'Bác sĩ', 'Người bệnh', 'Mã NB', 'Dịch vụ', 'ĐVT', 'Đơn giá', 'Số lượng', 'Thành tiền'],
              rows: groups.flatMap(([date, list]) =>
                list.map((x) => [formatDateVN(date), doctorLabel(x.visit.doctorId), x.patient.fullName, x.patient.code, x.line.name, x.line.unit, x.line.unitPrice, x.line.quantity, x.line.unitPrice * x.line.quantity]),
              ),
            })
          }
        />
      </Toolbar>
      <Table head={['#', 'Tên', 'ĐVT', 'Đơn giá', 'Số lượng', 'Thành tiền']} minWidth={700}>
        {groups.length === 0 && (
          <tr>
            <td colSpan={6}>
              <EmptyState title="Không có dịch vụ chưa thu" />
            </td>
          </tr>
        )}
        {groups.map(([date, list]) => {
          const byDoctor = new Map<string, typeof list>()
          list.forEach((x) => byDoctor.set(x.visit.doctorId, [...(byDoctor.get(x.visit.doctorId) ?? []), x]))
          return (
            <FragmentRows key={date}>
              <tr className="bg-[#292524] font-semibold text-white">
                <td className="px-3 py-2" colSpan={5}>
                  – NGÀY: {formatDateVN(date)} ({new Set(list.map((x) => x.patient.id)).size})
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(list.reduce((s, x) => s + x.line.unitPrice * x.line.quantity, 0))}</td>
              </tr>
              {[...byDoctor.entries()].map(([did, dl]) => (
                <FragmentRows key={did}>
                  <tr className="bg-subtle font-semibold text-ink">
                    <td className="px-3 py-2 pl-6" colSpan={5}>
                      – BÁC SĨ: {doctorLabel(did).toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(dl.reduce((s, x) => s + x.line.unitPrice * x.line.quantity, 0))}</td>
                  </tr>
                  {dl.map((x, i) => (
                    <tr key={`${x.visit.id}${x.line.refId}`} className="transition-colors hover:bg-brand-wash">
                      <td className={cn(td, 'text-ink-3 tabular-nums')}>{i + 1}</td>
                      <td className={td}>
                        <span className="font-medium text-ink">{x.line.name}</span>
                        <span className="ml-1 text-xs text-ink-3">
                          · {x.patient.fullName} ({x.patient.code})
                        </span>
                      </td>
                      <td className={cn(td, 'text-ink-2')}>{x.line.unit}</td>
                      <td className={tdR}>{formatNumber(x.line.unitPrice)}</td>
                      <td className={tdR}>{x.line.quantity}</td>
                      <td className={cn(tdR, 'font-medium text-ink')}>{formatNumber(x.line.unitPrice * x.line.quantity)}</td>
                    </tr>
                  ))}
                </FragmentRows>
              ))}
            </FragmentRows>
          )
        })}
        {groups.length > 0 && (
          <tr className="font-semibold">
            <td className={td} colSpan={5}>
              Tổng cộng {new Set(groups.flatMap(([, l]) => l.map((x) => x.patient.id))).size} người bệnh
            </td>
            <td className={tdR}>{formatNumber(total)}</td>
          </tr>
        )}
      </Table>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Hoá đơn phòng khám (143–148)                                        */
/* ------------------------------------------------------------------ */

function InvoicesReport() {
  const { visits, patients } = useClinicState()
  const exportCsv = useExport()
  const [range, setRange] = useState<DateRange>(() => presetRange('today'))
  const [method, setMethod] = useState<'all' | PaymentMethod>('all')
  const [status, setStatus] = useState<'all' | 'not_issued' | 'issued'>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [open, setOpen] = useState<{ visitId: string; paymentId: string } | null>(null)
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const rows = useMemo(
    () =>
      visits
        .flatMap((v) => v.payments.filter((p) => p.kind === 'payment').map((p) => ({ v, p, patient: byId.get(v.patientId) })))
        .filter(({ p }) => inRange(localDate(p.at), range.from, range.to))
        .filter(({ p }) => method === 'all' || p.method === method)
        .filter(({ p }) => status === 'all' || (p.invoice?.status === 'issued' ? 'issued' : 'not_issued') === status)
        .filter(({ v, p, patient }) => !q || normalizeText(`${patient?.fullName} ${p.code} ${v.code}`).includes(normalizeText(q)))
        .sort((a, b) => b.p.at.localeCompare(a.p.at)),
    [visits, byId, range, method, status, q],
  )
  const pageCount = Math.ceil(rows.length / pageSize)
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  return (
    <>
      <Toolbar>
        <div>
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Kỳ</span>
          <DateRangePicker value={range} onChange={(r) => (setRange(r), setPage(1))} />
        </div>
        <Select
          label="Phương thức thanh toán"
          value={method}
          options={[{ value: 'all', label: 'Tất cả' }, ...(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))]}
          onChange={(v) => (setMethod(v), setPage(1))}
          className="w-[170px]"
        />
        <Select
          label="Trạng thái HĐĐT"
          value={status}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'not_issued', label: 'Chưa phát hành' },
            { value: 'issued', label: 'Đã phát hành' },
          ]}
          onChange={(v) => (setStatus(v), setPage(1))}
          className="w-[150px]"
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo tên khách hàng, mã hoá đơn..." aria-label="Tìm theo tên khách hàng, mã hoá đơn" className="h-9 w-[280px] rounded-[10px] border border-line-strong bg-surface pr-3 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </div>
        <ExportBtn
          label="Tải về"
          onClick={() =>
            exportCsv({
              report: 'Hoá đơn phòng khám',
              rangeLabel: rangeLabel(range),
              filename: `hoa-don-${range.from}-${range.to}`,
              header: ['Mã hoá đơn', 'Khách hàng', 'Ngày thanh toán', 'PT thanh toán', 'Tổng tiền', 'Trạng thái HĐĐT'],
              rows: rows.map(({ p, patient }) => [p.code ?? p.id, patient?.fullName ?? '', formatDateTimeVN(p.at), PAYMENT_METHOD_LABEL[p.method], p.amount, p.invoice?.status === 'issued' ? 'Đã phát hành' : 'Chưa phát hành']),
            })
          }
        />
      </Toolbar>
      <Table head={['#', 'Mã hoá đơn', 'Khách hàng', 'Ngày thanh toán', 'PT thanh toán', 'Tổng tiền', 'Trạng thái HĐĐT', '']}>
        {pageRows.length === 0 && (
          <tr>
            <td colSpan={8}>
              <EmptyState />
            </td>
          </tr>
        )}
        {pageRows.map(({ v, p, patient }, i) => (
          <tr key={p.id} className="transition-colors hover:bg-brand-wash">
            <td className={cn(td, 'text-ink-3 tabular-nums')}>{(page - 1) * pageSize + i + 1}</td>
            <td className={td}>
              <button type="button" onClick={() => setOpen({ visitId: v.id, paymentId: p.id })} className="font-semibold text-info-ink hover:underline tabular-nums">
                {p.code ?? p.id.toUpperCase()}
              </button>
            </td>
            <td className={cn(td, 'font-semibold text-ink uppercase')}>{patient?.fullName}</td>
            <td className={cn(td, 'text-ink-2 tabular-nums')}>{formatDateTimeVN(p.at).split(' ').reverse().join(' ')}</td>
            <td className={cn(td, 'text-ink-2')}>{PAYMENT_METHOD_LABEL[p.method]}</td>
            <td className={cn(tdR, 'font-semibold text-ink')}>{formatNumber(p.amount)}</td>
            <td className={td}>
              <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11.5px]', p.invoice?.status === 'issued' ? 'bg-brand-soft font-semibold text-brand-ink' : 'bg-subtle font-medium text-ink-3')}>
                {p.invoice?.status === 'issued' ? 'Đã phát hành' : 'Chưa phát hành'}
              </span>
            </td>
            <td className={td}>
              <DropdownMenu
                align="end"
                renderTrigger={({ ref, toggle }) => (
                  <button ref={ref} type="button" onClick={toggle} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-subtle" aria-label="Thao tác">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              >
                <MenuItem icon={<Receipt className="h-3.5 w-3.5" />} onSelect={() => setOpen({ visitId: v.id, paymentId: p.id })}>
                  Xem chi tiết
                </MenuItem>
                <MenuItem icon={<Printer className="h-3.5 w-3.5" />} onSelect={() => setOpen({ visitId: v.id, paymentId: p.id })}>
                  In phiếu bán hàng
                </MenuItem>
                <MenuItem icon={<Upload className="h-3.5 w-3.5" />} disabled={p.invoice?.status === 'issued'} onSelect={() => setOpen({ visitId: v.id, paymentId: p.id })}>
                  Phát hành hoá đơn điện tử
                </MenuItem>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-2.5 rounded-[14px] border border-line bg-surface px-4">
        <Pagination page={page} pageCount={pageCount} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
      </div>
      {open && <ReceiptModal visitId={open.visitId} paymentId={open.paymentId} onClose={() => setOpen(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Báo cáo khám bệnh (149–150)                                         */
/* ------------------------------------------------------------------ */

function ExamReport() {
  const rows = useVisitRows()
  const exportCsv = useExport()
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [doctor, setDoctor] = useState('all')
  const [openDay, setOpenDay] = useState<string | null>(null)
  const items = useMemo(
    () =>
      rows
        .filter(({ visit: v }) => v.status === 'done' && inRange(v.date, from, to) && (doctor === 'all' || v.doctorId === doctor))
        .map(({ visit, patient }) => {
          const ck = visit.consultationFee ?? 0
          const cls = clsCharge(visit.paraclinicalOrders, visit.payments)
          const disc = visit.payments.filter((p) => p.kind === 'payment').reduce((s, p) => s + (p.discount ?? 0) + (p.lines ?? []).reduce((a, l) => a + l.discount, 0), 0)
          return { visit, patient, ck, cls, drug: 0, disc, total: ck + cls - disc }
        }),
    [rows, from, to, doctor],
  )
  const days = [...new Set(items.map((i) => i.visit.date))].sort().reverse()
  const sum = (list: typeof items, k: 'ck' | 'cls' | 'drug' | 'disc' | 'total') => list.reduce((s, i) => s + i[k], 0)
  return (
    <>
      <Toolbar>
        <DateBox label="Từ ngày" value={from} onChange={setFrom} />
        <DateBox label="Đến ngày" value={to} onChange={setTo} />
        <Select label="Bác sĩ" value={doctor} options={[{ value: 'all', label: 'Tất cả' }, ...DOCTORS.map((d) => ({ value: d.id, label: `${d.title} ${d.name}` }))]} onChange={setDoctor} className="w-[200px]" />
        <ExportBtn
          label="Tải về"
          onClick={() =>
            exportCsv({
              report: 'Báo cáo khám bệnh',
              rangeLabel: `${formatDateVN(from)} - ${formatDateVN(to)}`,
              filename: `bao-cao-kham-benh-${from}-${to}`,
              header: ['Ngày', 'Bác sĩ', 'Người bệnh', 'Chẩn đoán', 'Tiền CK', 'Tiền CLS', 'Tiền thuốc', 'Giảm giá', 'Tổng cộng'],
              rows: items.map((i) => [formatDateVN(i.visit.date), doctorLabel(i.visit.doctorId), i.patient.fullName, (i.visit.exam?.diagnoses ?? []).map((d) => d.code || d.name).join('; '), i.ck, i.cls, i.drug, i.disc, i.total]),
            })
          }
        />
      </Toolbar>
      <Table head={['#', 'Người bệnh', 'Chẩn đoán', 'Tiền CK', 'Tiền CLS', 'Tiền thuốc', 'Giảm giá', 'Tổng cộng']}>
        {days.length === 0 && (
          <tr>
            <td colSpan={8}>
              <EmptyState />
            </td>
          </tr>
        )}
        {days.map((d) => {
          const list = items.filter((i) => i.visit.date === d)
          const byDoc = [...new Set(list.map((i) => i.visit.doctorId))]
          return (
            <FragmentRows key={d}>
              <tr className="cursor-pointer bg-brand-tint font-semibold text-brand-ink transition-colors hover:bg-brand-soft" onClick={() => setOpenDay(openDay === d ? null : d)}>
                <td className="px-3 py-2">{openDay === d ? '−' : '+'}</td>
                <td className="px-3 py-2 tabular-nums" colSpan={2}>
                  Ngày: {formatDateVN(d)} ({list.length})
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(list, 'ck'))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(list, 'cls'))}</td>
                <td className="px-3 py-2 text-right tabular-nums">0</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(list, 'disc'))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(list, 'total'))}</td>
              </tr>
              {openDay === d &&
                byDoc.map((did) => {
                  const dl = list.filter((i) => i.visit.doctorId === did)
                  return (
                    <FragmentRows key={did}>
                      <tr className="bg-canvas font-semibold text-ink">
                        <td />
                        <td className="px-3 py-2" colSpan={2}>
                          Bác sĩ: {doctorLabel(did)} ({dl.length})
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(dl, 'ck'))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(dl, 'cls'))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">0</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(dl, 'disc'))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatNumber(sum(dl, 'total'))}</td>
                      </tr>
                      {dl.map((i, n) => (
                        <tr key={i.visit.id}>
                          <td className={td}>{n + 1}</td>
                          <td className={td}>
                            <span className="uppercase">{i.patient.fullName}</span> | {GENDER_LABEL[i.patient.gender]} | {ageInYears(i.patient.dob, d)} tuổi ({i.patient.dob.slice(0, 4)})
                          </td>
                          <td className={cn(td, 'max-w-[220px] truncate')}>{(i.visit.exam?.diagnoses ?? []).map((x) => x.code || x.name).join('; ')}</td>
                          <td className={tdR}>{formatNumber(i.ck)}</td>
                          <td className={tdR}>{formatNumber(i.cls)}</td>
                          <td className={tdR}>0</td>
                          <td className={tdR}>{formatNumber(i.disc)}</td>
                          <td className={tdR}>{formatNumber(i.total)}</td>
                        </tr>
                      ))}
                    </FragmentRows>
                  )
                })}
            </FragmentRows>
          )
        })}
        {days.length > 0 && (
          <>
            <tr className="font-semibold">
              <td className={td} colSpan={3}>
                Tổng cộng
              </td>
              <td className={tdR}>{formatNumber(sum(items, 'ck'))}</td>
              <td className={tdR}>{formatNumber(sum(items, 'cls'))}</td>
              <td className={tdR}>0</td>
              <td className={tdR}>{formatNumber(sum(items, 'disc'))}</td>
              <td className={tdR}>{formatNumber(sum(items, 'total'))}</td>
            </tr>
            <tr className="font-semibold">
              <td className={td} colSpan={4}>
                Tổng ngày khám: {days.length}
              </td>
              <td className={cn(td, 'text-right')} colSpan={4}>
                Tổng số người bệnh đã khám: {new Set(items.map((i) => i.patient.id)).size}
              </td>
            </tr>
          </>
        )}
      </Table>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Sổ khám bệnh (151–152)                                              */
/* ------------------------------------------------------------------ */

function ExamBook() {
  const rows = useVisitRows()
  const exportCsv = useExport()
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [doctor, setDoctor] = useState('all')
  const items = useMemo(
    () => rows.filter(({ visit: v }) => v.status === 'done' && inRange(v.date, from, to) && (doctor === 'all' || v.doctorId === doctor)).sort((a, b) => `${a.visit.date}${a.visit.time}`.localeCompare(`${b.visit.date}${b.visit.time}`)),
    [rows, from, to, doctor],
  )
  const days = [...new Set(items.map((i) => i.visit.date))]
  const head = ['TT', 'MSBN', 'Họ và tên', 'Điện thoại', 'Tuổi Nam', 'Tuổi Nữ', 'Số thẻ BHYT', 'Địa chỉ', 'Nghề nghiệp', 'Dân tộc', 'Triệu chứng', 'Chẩn đoán', 'Phương pháp điều trị', 'Y, Bs khám bệnh', 'Ghi chú']
  const rowOf = ({ visit: v, patient: p }: (typeof items)[number], i: number) => {
    const age = `${ageInYears(p.dob, v.date)} tuổi (${p.dob.slice(0, 4)})`
    return [
      i + 1,
      p.code,
      p.fullName,
      formatPhone(p.phone),
      p.gender === 'male' ? age : '',
      p.gender === 'female' ? age : '',
      p.insuranceNumber ?? '',
      p.address,
      p.occupation ?? '',
      p.ethnicity ?? '',
      v.symptoms || v.reason,
      (v.exam?.diagnoses ?? []).map((d) => d.code || d.name).join('; '),
      (v.exam?.prescription ?? []).map((x) => `${x.name} (${x.quantity} ${x.quantityUnit}/${x.days} ngày)`).join('; '),
      doctorLabel(v.doctorId),
      v.note,
    ]
  }
  return (
    <>
      <Toolbar>
        <DateBox label="Từ ngày" value={from} onChange={setFrom} />
        <DateBox label="Đến ngày" value={to} onChange={setTo} />
        <Select label="Bác sĩ" value={doctor} options={[{ value: 'all', label: 'Tất cả' }, ...DOCTORS.map((d) => ({ value: d.id, label: `${d.title} ${d.name}` }))]} onChange={setDoctor} className="w-[200px]" />
        <ExportBtn
          label="Tải về"
          onClick={() =>
            exportCsv({ report: 'Sổ khám bệnh', rangeLabel: `${formatDateVN(from)} - ${formatDateVN(to)}`, filename: `so-kham-benh-${from}-${to}`, header: head, rows: items.map(rowOf) })
          }
        />
      </Toolbar>
      <Table head={head.map((h, i) => <span key={h}>{h}<span className="block text-[10.5px] font-normal text-ink-4">({i + 1})</span></span>)} minWidth={1600}>
        {days.length === 0 && (
          <tr>
            <td colSpan={head.length}>
              <EmptyState />
            </td>
          </tr>
        )}
        {days.map((d) => {
          const list = items.filter((i) => i.visit.date === d)
          return (
            <FragmentRows key={d}>
              <tr className="bg-canvas font-semibold text-ink">
                <td className="px-3 py-2 tabular-nums" colSpan={head.length}>
                  • Ngày: {formatDateVN(d)} ({new Set(list.map((x) => x.patient.id)).size} người bệnh)
                </td>
              </tr>
              {list.map((x, i) => (
                <tr key={x.visit.id} className="align-top transition-colors hover:bg-brand-wash">
                  {rowOf(x, i).map((c, k) => (
                    <td key={k} className={cn(td, 'text-[12.5px]', k >= 10 && 'max-w-[220px]')}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </FragmentRows>
          )
        })}
      </Table>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Lịch sử tải về (153)                                                */
/* ------------------------------------------------------------------ */

function DownloadHistory() {
  const { reportDownloads } = useClinicState()
  const toast = useToast()
  const [from, setFrom] = useState(() => addDays(todayISO(), -7))
  const [to, setTo] = useState(todayISO)
  const [report, setReport] = useState('all')
  const [status, setStatus] = useState('all')
  const [fileType, setFileType] = useState('all')
  const list = (reportDownloads ?? []).filter(
    (d) => inRange(localDate(d.at), from, to) && (report === 'all' || d.report === report) && (status === 'all' || d.status === status) && (fileType === 'all' || d.fileType.toLowerCase() === fileType),
  )
  const reports = [...new Set((reportDownloads ?? []).map((d) => d.report))]
  return (
    <>
      <Toolbar>
        <DateBox label="Từ ngày" value={from} onChange={setFrom} />
        <DateBox label="Đến ngày" value={to} onChange={setTo} />
        <Select label="Loại báo cáo" value={report} options={[{ value: 'all', label: 'Tất cả' }, ...reports.map((r) => ({ value: r, label: r }))]} onChange={setReport} className="w-[180px]" />
        <Select label="Trạng thái" value={status} options={[{ value: 'all', label: 'Tất cả' }, { value: 'success', label: 'Thành công' }, { value: 'failed', label: 'Thất bại' }]} onChange={setStatus} className="w-[120px]" />
        <Select label="Loại tập tin" value={fileType} options={[{ value: 'all', label: 'Tất cả' }, { value: 'csv', label: 'Excel (CSV)' }]} onChange={setFileType} className="w-[130px]" />
      </Toolbar>
      <Table head={['#', 'Tên báo cáo', 'Loại tập tin', 'Trạng thái', 'Ngày cập nhật', 'Hành động']} minWidth={700}>
        {list.length === 0 && (
          <tr>
            <td colSpan={6}>
              <EmptyState description="Các báo cáo đã xuất sẽ hiển thị tại đây." />
            </td>
          </tr>
        )}
        {list.map((d, i) => (
          <tr key={d.id} className="transition-colors hover:bg-brand-wash">
            <td className={cn(td, 'text-ink-3 tabular-nums')}>{i + 1}</td>
            <td className={cn(td, 'font-medium text-ink')}>{d.name}</td>
            <td className={td}>
              <span className="inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-ink">Excel (CSV)</span>
            </td>
            <td className={td}>
              <span className="inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11.5px] font-semibold text-white">Thành công</span>
            </td>
            <td className={cn(td, 'text-ink-2 tabular-nums')}>{formatDateTimeVN(d.at)}</td>
            <td className={td}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RotateCw className="h-3.5 w-3.5" />}
                disabled={!d.content}
                onClick={() => {
                  if (!d.content) return
                  downloadText(d.content, `${d.report}.csv`)
                  toast({ title: 'Đã tải lại báo cáo', tone: 'success' })
                }}
              >
                Tải lại
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  )
}
