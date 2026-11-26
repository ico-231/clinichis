import { Fragment, useMemo, useState } from 'react'
import { Check, ChevronDown, ClipboardCheck, Hourglass, ListFilter, Pencil, Printer, ReceiptText, Search, SlidersHorizontal, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DateRangePicker, presetRange, type DateRange } from '@/components/ui/DateRangePicker'
import { DropdownMenu, MenuCheckItem, MenuItem, MenuLabel } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Drawer, Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
import { CLINIC, GENDER_LABEL } from '@/store/catalog'
import { PARACLINICAL_PROVIDERS } from '@/store/paraclinicalCatalog'
import { isLinePaid } from '@/store/billing'
import { ageInYears, ageLabel, formatDateTimeVN, formatDateVN } from '@/lib/date'
import { formatNumber, formatPhone, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { OrderSheetDoc, PrintPreviewModal } from '../examination/PrintDocs'
import { draftFromVisit } from '../examination/examDraft'
import { ReceiptsTab } from '../visit/VisitInfoDrawer'
import { ImagingResultEditor } from './ImagingResultEditor'
import { LabResultModal } from './LabResultModal'
import { ResultViewer } from './ResultViewer'
import { PERFORM_STATUS, RESULT_FILTER_LABEL, performOf, resultStateOf, useOrderGroups, type OrderGroup, type ResultFilter } from './clsData'
import type { ParaclinicalOrderItem, PerformStatus } from '@/store/types'

type OverviewCol = 'patient' | 'orderedAt' | 'performedAt' | 'payment' | 'total'
type DetailCol = 'unit' | 'perform' | 'payment' | 'unitPrice' | 'quantity' | 'amount'

const OVERVIEW_COLS: { key: OverviewCol; label: string }[] = [
  { key: 'patient', label: 'Người bệnh' },
  { key: 'orderedAt', label: 'Nơi chỉ định' },
  { key: 'performedAt', label: 'Nơi thực hiện' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'total', label: 'Tổng tiền' },
]
const DETAIL_COLS: { key: DetailCol; label: string }[] = [
  { key: 'unit', label: 'Đơn vị' },
  { key: 'perform', label: 'Trạng thái thực hiện' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'unitPrice', label: 'Đơn giá' },
  { key: 'quantity', label: 'Số lượng' },
  { key: 'amount', label: 'Thành tiền' },
]

const ALL = { value: 'all', label: 'Tất cả' } as const

interface Advanced {
  payment: 'all' | 'paid' | 'unpaid'
  orderedAt: 'all' | 'internal' | 'external'
  performedAt: 'all' | 'internal' | 'satellite'
}

/** Danh sách phiếu chỉ định cho phòng CĐHA (045–051) và Xét nghiệm (057) */
export function ParaclinicalListPage({ category }: { category: 'imaging' | 'lab' }) {
  const groups = useOrderGroups(category)
  const { updateOrder } = useClinicActions()
  const toast = useToast()
  const title = category === 'imaging' ? 'Kết quả chẩn đoán hình ảnh' : 'Kết quả xét nghiệm'

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<DateRange>(() => presetRange('today'))
  const [providerId, setProviderId] = useState('all')
  const [perform, setPerform] = useState<PerformStatus | 'all'>('all')
  const [result, setResult] = useState<ResultFilter | 'all'>('all')
  const [adv, setAdv] = useState<Advanced>({ payment: 'all', orderedAt: 'all', performedAt: 'all' })
  const [advOpen, setAdvOpen] = useState(false)
  const [overview, setOverview] = useState<OverviewCol[]>(OVERVIEW_COLS.map((c) => c.key))
  const [detail, setDetail] = useState<DetailCol[]>(['perform', 'payment'])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editing, setEditing] = useState<{ visitId: string; orderId: string } | null>(null)
  const [viewing, setViewing] = useState<{ visitId: string; orderId: string } | null>(null)
  const [receiptsFor, setReceiptsFor] = useState<OrderGroup | null>(null)
  const [printFor, setPrintFor] = useState<OrderGroup | null>(null)

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return groups.filter((g) => {
      if (g.visit.date < range.from || g.visit.date > range.to) return false
      if (providerId !== 'all' && g.providerId !== providerId) return false
      if (perform !== 'all' && !g.items.some((o) => performOf(o) === perform)) return false
      if (result !== 'all' && !g.items.some((o) => resultStateOf(o) === result)) return false
      if (adv.payment !== 'all' && (adv.payment === 'paid') !== g.paid) return false
      if (adv.orderedAt === 'external') return false // mọi chỉ định đều phát sinh tại phòng khám
      if (adv.performedAt !== 'all' && (adv.performedAt === 'internal') !== g.internal) return false
      if (q && !normalizeText(`${g.code} ${g.visit.code} ${g.patient.fullName} ${g.patient.phone}`).includes(q)) return false
      return true
    })
  }, [groups, query, range, providerId, perform, result, adv])

  const pageCount = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const providers = PARACLINICAL_PROVIDERS.filter((p) => groups.some((g) => g.providerId === p.id) || p.isInternal)
  const advCount = (Object.values(adv) as string[]).filter((v) => v !== 'all').length
  const show = (c: OverviewCol) => overview.includes(c)
  const showD = (c: DetailCol) => detail.includes(c)

  const setGroupPerform = (g: OrderGroup, to: PerformStatus) => {
    g.items.filter((o) => performOf(o) !== 'cancelled').forEach((o) => updateOrder(g.visit.id, o.id, { performStatus: to }))
    toast({ title: `${g.code} → ${PERFORM_STATUS[to].label}`, description: g.patient.fullName })
  }
  const setItemPerform = (g: OrderGroup, o: ParaclinicalOrderItem, to: PerformStatus) => {
    updateOrder(g.visit.id, o.id, { performStatus: to })
    toast({ title: `${o.name} → ${PERFORM_STATUS[to].label}` })
  }

  const colCount = 3 + overview.length

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title={title} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6 2xl:px-8 pt-1 pb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              value={query}
              onChange={(e) => (setQuery(e.target.value), setPage(1))}
              placeholder="Tìm kiếm mã phiếu khám, mã phiếu chỉ định, người bệnh"
              aria-label="Tìm kiếm mã phiếu khám, mã phiếu chỉ định, người bệnh"
              className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <DateRangePicker value={range} onChange={(r) => (setRange(r), setPage(1))} presets={['today', 'yesterday', '7d', '30d', 'month']} />
          <Select
            label="Phòng CLS"
            value={providerId}
            options={[ALL, ...providers.map((p) => ({ value: p.id, label: p.name }))]}
            onChange={(v) => (setProviderId(v), setPage(1))}
            className="w-[150px]"
          />
          <Select
            label="Trạng thái thực hiện"
            value={perform}
            options={[ALL, ...(Object.keys(PERFORM_STATUS) as PerformStatus[]).filter((k) => k !== 'no_show').map((k) => ({ value: k, label: PERFORM_STATUS[k].label }))]}
            onChange={(v) => (setPerform(v), setPage(1))}
            className="w-[155px]"
          />
          <Select
            label="Trạng thái trả kết quả"
            value={result}
            options={[ALL, ...(Object.keys(RESULT_FILTER_LABEL) as ResultFilter[]).map((k) => ({ value: k, label: RESULT_FILTER_LABEL[k] }))]}
            onChange={(v) => (setResult(v), setPage(1))}
            className="w-[160px]"
          />
          <Button variant="outline" leftIcon={<ListFilter className="h-3.5 w-3.5" />} onClick={() => setAdvOpen(true)} className={cn(advCount > 0 && 'border-brand bg-brand-tint text-brand-ink')}>
            Nâng cao{advCount > 0 && ` (${advCount})`}
          </Button>
          <DropdownMenu
            align="end"
            className="w-56"
            renderTrigger={({ ref, toggle }) => (
              <Button ref={ref} variant="outline" size="icon" onClick={toggle} aria-label="Cột hiển thị" title="Cột hiển thị">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            )}
          >
            <MenuLabel>Cột của bảng tổng quan</MenuLabel>
            {OVERVIEW_COLS.map((c) => (
              <MenuCheckItem key={c.key} checked={show(c.key)} onToggle={() => setOverview((v) => (v.includes(c.key) ? v.filter((x) => x !== c.key) : [...v, c.key]))}>
                {c.label}
              </MenuCheckItem>
            ))}
            <MenuLabel>Cột của bảng chi tiết</MenuLabel>
            {DETAIL_COLS.map((c) => (
              <MenuCheckItem key={c.key} checked={showD(c.key)} onToggle={() => setDetail((v) => (v.includes(c.key) ? v.filter((x) => x !== c.key) : [...v, c.key]))}>
                {c.label}
              </MenuCheckItem>
            ))}
          </DropdownMenu>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="thin-scroll min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
                <tr>
                  <th className="w-9" />
                  <th className="px-3 py-2.5 text-left font-semibold">Mã chỉ định</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Trạng thái thực hiện</th>
                  {show('patient') && <th className="px-3 py-2.5 text-left font-semibold">Người bệnh</th>}
                  {show('orderedAt') && <th className="px-3 py-2.5 text-left font-semibold">Nơi chỉ định</th>}
                  {show('performedAt') && <th className="px-3 py-2.5 text-left font-semibold">Nơi thực hiện</th>}
                  {(show('total') || show('payment')) && <th className="px-3 py-2.5 text-right font-semibold">Tổng tiền</th>}
                  <th className="w-[92px] px-3 py-2.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={colCount + 1}>
                      <EmptyState />
                    </td>
                  </tr>
                )}
                {pageRows.map((g) => {
                  const open = expanded === g.key
                  return (
                    <Fragment key={g.key}>
                      <tr onClick={() => setExpanded(open ? null : g.key)} className={cn('cursor-pointer transition-colors hover:bg-brand-wash', open && 'bg-brand-tint/70 hover:bg-brand-tint/70')}>
                        <td className="pl-3">
                          <ChevronDown className={cn('h-4 w-4 text-ink-3 transition-transform', !open && '-rotate-90')} />
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-info-ink tabular-nums">{g.code}</td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <PerformMenu value={g.perform} onChange={(to) => setGroupPerform(g, to)} />
                        </td>
                        {show('patient') && (
                          <td className="px-3 py-2.5">
                            <span className="block font-semibold text-ink uppercase">{g.patient.fullName}</span>
                            <span className="text-xs text-ink-3 tabular-nums">
                              {formatPhone(g.patient.phone)} · {GENDER_LABEL[g.patient.gender]} · {ageLabel(g.patient.dob, g.visit.date)}
                            </span>
                          </td>
                        )}
                        {show('orderedAt') && (
                          <td className="max-w-[200px] px-3 py-2.5">
                            <span className="block truncate font-medium text-ink">{CLINIC.name}</span>
                            <span className="block truncate text-xs text-ink-3" title={CLINIC.address}>{CLINIC.address}</span>
                          </td>
                        )}
                        {show('performedAt') && (
                          <td className="max-w-[220px] px-3 py-2.5">
                            <span className="block truncate font-medium text-ink">{g.providerName}</span>
                            <span className="block truncate text-xs text-ink-3" title={g.providerAddress}>{g.providerAddress}</span>
                          </td>
                        )}
                        {(show('total') || show('payment')) && (
                          <td className="px-3 py-2.5 text-right">
                            {show('total') && <span className="block font-semibold text-ink tabular-nums">{formatNumber(g.total)}</span>}
                            {show('payment') && <PayChip paid={g.paid} />}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex gap-1.5">
                            <IconBtn label="Xem phiếu thu" onClick={() => setReceiptsFor(g)}>
                              <ReceiptText className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="In phiếu chỉ định" onClick={() => setPrintFor(g)}>
                              <Printer className="h-3.5 w-3.5" />
                            </IconBtn>
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-canvas">
                          <td colSpan={colCount + 1} className="px-4 py-3">
                            <GroupDetail
                              group={g}
                              showD={showD}
                              onPerform={(o, to) => setItemPerform(g, o, to)}
                              onEdit={(o) => setEditing({ visitId: g.visit.id, orderId: o.id })}
                              onView={(o) => setViewing({ visitId: g.visit.id, orderId: o.id })}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4">
            <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
          </div>
        </div>
      </div>

      {advOpen && <AdvancedDrawer value={adv} onClose={() => setAdvOpen(false)} onApply={(v) => (setAdv(v), setPage(1), setAdvOpen(false))} />}

      {editing && category === 'imaging' && <ImagingResultEditor visitId={editing.visitId} orderId={editing.orderId} onClose={() => setEditing(null)} />}
      {editing && category === 'lab' && <LabResultModal visitId={editing.visitId} orderId={editing.orderId} onClose={() => setEditing(null)} />}
      {viewing && <ResultViewer visitId={viewing.visitId} orderId={viewing.orderId} onClose={() => setViewing(null)} />}

      <Modal open={!!receiptsFor} onClose={() => setReceiptsFor(null)} size="lg" title="Xem phiếu thu" description={receiptsFor ? `${receiptsFor.patient.fullName} · ${receiptsFor.visit.code}` : undefined}>
        {receiptsFor && <ReceiptsTab visit={receiptsFor.visit} />}
      </Modal>
      <PrintPreviewModal open={!!printFor} title="Phiếu chỉ định" onClose={() => setPrintFor(null)}>
        {printFor && (
          <OrderSheetDoc visit={printFor.visit} patient={printFor.patient} draft={{ ...draftFromVisit(printFor.visit), orders: printFor.items }} />
        )}
      </PrintPreviewModal>
    </div>
  )
}

function GroupDetail({
  group: g,
  showD,
  onPerform,
  onEdit,
  onView,
}: {
  group: OrderGroup
  showD: (c: DetailCol) => boolean
  onPerform: (o: ParaclinicalOrderItem, to: PerformStatus) => void
  onEdit: (o: ParaclinicalOrderItem) => void
  onView: (o: ParaclinicalOrderItem) => void
}) {
  const [tab, setTab] = useState<'services' | 'patient' | 'sheet'>('services')
  const p = g.patient
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-xs">
      <div className="border-b border-line px-3.5 pt-2">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'services', label: 'Dịch vụ cận lâm sàng' },
            { value: 'patient', label: 'Thông tin người bệnh' },
            { value: 'sheet', label: 'Phiếu chỉ định' },
          ]}
        />
      </div>
      {tab === 'services' && (
        <table className="w-full text-[13px]">
          <thead className="border-b border-line bg-subtle/70 text-[12.5px] font-semibold text-ink-3">
            <tr>
              <th className="w-9 py-2.5 pl-3.5 text-left font-semibold" />
              <th className="py-2.5 text-left font-semibold">Dịch vụ</th>
              {showD('unit') && <th className="py-2.5 text-center font-semibold">Đơn vị</th>}
              {showD('unitPrice') && <th className="py-2.5 text-right font-semibold">Đơn giá</th>}
              {showD('quantity') && <th className="py-2.5 text-center font-semibold">SL</th>}
              {showD('amount') && <th className="py-2.5 text-right font-semibold">Thành tiền</th>}
              {showD('perform') && <th className="py-2.5 pl-4 text-left font-semibold">Trạng thái thực hiện</th>}
              <th className="py-2.5 text-left font-semibold">Trạng thái trả kết quả</th>
              <th className="py-2.5 pr-3.5 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {g.items.map((o, i) => {
              const paid = isLinePaid(g.visit, { kind: 'paraclinical', refId: o.id })
              const has = o.resultStatus === 'has_result'
              const st = performOf(o)
              const locked = st === 'cancelled' || st === 'no_show'
              return (
                <tr key={o.id} className="transition-colors hover:bg-canvas">
                  <td className="py-2.5 pl-3.5 text-ink-3 tabular-nums">{i + 1}</td>
                  <td className="py-2.5">
                    <span className="font-semibold text-ink">{o.name}</span>
                    <span className="block text-xs text-ink-3">
                      Phòng thực hiện: {o.providerName}
                      {showD('payment') && <span className={paid ? 'font-medium text-brand-ink' : 'font-medium text-accent-ink'}> · {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>}
                    </span>
                    {o.instruction && <span className="block text-xs text-ink-3 italic">HD: {o.instruction}</span>}
                  </td>
                  {showD('unit') && <td className="py-2.5 text-center text-ink-2">Lượt</td>}
                  {showD('unitPrice') && <td className="py-2.5 text-right text-ink-2 tabular-nums">{formatNumber(o.unitPrice)}</td>}
                  {showD('quantity') && <td className="py-2.5 text-center text-ink-2 tabular-nums">{o.quantity}</td>}
                  {showD('amount') && <td className="py-2.5 text-right font-medium text-ink tabular-nums">{formatNumber(o.unitPrice * o.quantity)}</td>}
                  {showD('perform') && (
                    <td className="py-2.5 pl-4">
                      <PerformMenu value={st} onChange={(to) => onPerform(o, to)} />
                    </td>
                  )}
                  <td className="py-2.5">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold', has ? 'bg-brand-soft text-brand-ink' : 'bg-accent-soft text-accent-strong')}>
                      {has ? <ClipboardCheck className="h-3 w-3" /> : <Hourglass className="h-3 w-3" />}
                      {has ? 'Có kết quả' : 'Chờ kết quả'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3.5 text-right">
                    <span className="inline-flex gap-1.5">
                      {has && (
                        <Button size="sm" variant="ghost" onClick={() => onView(o)}>
                          Xem
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={locked} leftIcon={has ? <Pencil className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />} onClick={() => onEdit(o)}>
                        {has ? 'Cập nhật kết quả' : 'Trả kết quả'}
                      </Button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {tab === 'patient' && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 px-4 py-3.5 text-[13px] md:grid-cols-3">
          {[
            ['Họ và tên', <b className="uppercase">{p.fullName}</b>],
            ['Mã người bệnh', <span className="font-semibold text-info-ink tabular-nums">{p.code}</span>],
            ['Ngày sinh', <span className="tabular-nums">{`${formatDateVN(p.dob)} (${ageInYears(p.dob, g.visit.date)} tuổi)`}</span>],
            ['Giới tính', GENDER_LABEL[p.gender]],
            ['Điện thoại', <span className="tabular-nums">{formatPhone(p.phone)}</span>],
            ['Địa chỉ', p.address],
            ['Mã khám', <span className="font-semibold text-info-ink tabular-nums">{g.visit.code}</span>],
            ['Chẩn đoán', g.visit.exam?.diagnoses.map((d) => d.code || d.name).join(', ') || '--'],
            ['Ngày chỉ định', <span className="tabular-nums">{formatDateTimeVN(g.sentAt)}</span>],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-ink-3">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {tab === 'sheet' && (
        <div className="bg-subtle p-4">
          <div className="paper mx-auto max-w-[680px] rounded-[8px] bg-surface px-8 py-6 font-doc text-[13px] leading-6 text-black shadow-sm">
            <OrderSheetDoc visit={g.visit} patient={g.patient} draft={{ ...draftFromVisit(g.visit), orders: g.items }} />
          </div>
        </div>
      )}
    </div>
  )
}

function PerformMenu({ value, onChange }: { value: PerformStatus; onChange: (to: PerformStatus) => void }) {
  const tone = PERFORM_STATUS[value].tone
  return (
    <DropdownMenu
      align="start"
      className="w-44"
      renderTrigger={({ ref, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90',
            tone === 'orange' && 'bg-accent-soft text-accent-strong',
            tone === 'blue' && 'bg-info-tint text-info-ink',
            tone === 'green' && 'bg-brand-soft text-brand-ink',
            tone === 'gray' && 'bg-subtle text-ink-3',
          )}
        >
          {value === 'done' ? <Check className="h-3 w-3" /> : <Hourglass className="h-3 w-3" />}
          {PERFORM_STATUS[value].label}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      )}
    >
      {(Object.keys(PERFORM_STATUS) as PerformStatus[]).map((k) => (
        <MenuItem key={k} danger={k === 'cancelled'} onSelect={() => k !== value && onChange(k)} shortcut={k === value ? <Check className="h-3.5 w-3.5 text-brand-ink" /> : undefined}>
          {PERFORM_STATUS[k].label}
        </MenuItem>
      ))}
    </DropdownMenu>
  )
}

function PayChip({ paid }: { paid: boolean }) {
  return <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold', paid ? 'bg-brand-soft text-brand-ink' : 'bg-accent-soft text-accent-strong')}>{paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-line text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
      {children}
    </button>
  )
}

function AdvancedDrawer({ value, onClose, onApply }: { value: Advanced; onClose: () => void; onApply: (v: Advanced) => void }) {
  const [draft, setDraft] = useState(value)
  const radio = <K extends keyof Advanced>(key: K, label: string, options: { value: Advanced[K]; label: string }[]) => (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-ink">{label}</legend>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="radio" name={key} checked={draft[key] === o.value} onChange={() => setDraft((d) => ({ ...d, [key]: o.value }))} className="accent-brand" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
  return (
    <Drawer
      open
      onClose={onClose}
      title="Tìm kiếm nâng cao"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => onApply({ payment: 'all', orderedAt: 'all', performedAt: 'all' })}>
            Đặt lại
          </Button>
          <Button onClick={() => onApply(draft)}>Áp dụng</Button>
        </div>
      }
    >
      <div className="space-y-5 px-4 py-3">
        <Select
          label="Trạng thái thanh toán"
          value={draft.payment}
          options={[ALL, { value: 'paid', label: 'Đã thanh toán' }, { value: 'unpaid', label: 'Chưa thanh toán' }]}
          onChange={(payment) => setDraft((d) => ({ ...d, payment }))}
        />
        {radio('orderedAt', 'Nơi chỉ định', [
          { value: 'all', label: 'Tất cả' },
          { value: 'internal', label: 'Nội bộ' },
          { value: 'external', label: 'Bên ngoài' },
        ])}
        {radio('performedAt', 'Nơi thực hiện', [
          { value: 'all', label: 'Tất cả' },
          { value: 'internal', label: 'Tại phòng lab nội bộ' },
          { value: 'satellite', label: 'Tại phòng lab vệ tinh' },
        ])}
      </div>
    </Drawer>
  )
}
