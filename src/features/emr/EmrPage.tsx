import { useMemo, useState } from 'react'
import { Download, MoreHorizontal, Pencil, Printer, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { ageLabel, formatDateTimeVN, formatDateVN } from '@/lib/date'
import { normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PrintPreviewModal } from '../examination/PrintDocs'
import { EmrDetail, useEmrRows } from './EmrDetail'
import { EmrPrintDoc } from './EmrPrintDoc'
import { emrCodeOf, SIGN_LABEL } from './emrData'
import type { SignStatus } from '@/store/types'

/** Danh sách bệnh án điện tử (ảnh 089–090, 103–104) */
export function EmrPage() {
  const rows = useEmrRows()
  const { ui } = useClinicState()
  const { setUI } = useClinicActions()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [state, setState] = useState<'all' | 'open' | 'closed'>('all')
  const [sign, setSign] = useState<'all' | SignStatus>('all')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [printId, setPrintId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const digits = q.replace(/\D/g, '')
    return rows
      .filter(({ visit, patient, emr }) => {
        if (from && visit.date < from) return false
        if (to && visit.date > to) return false
        if (state !== 'all' && (state === 'closed') !== emr.closed) return false
        if (sign !== 'all' && emr.signStatus !== sign) return false
        if (q && !normalizeText(`${patient.fullName} ${emrCodeOf(visit)} ${visit.code}`).includes(q) && !(digits.length >= 3 && patient.phone.includes(digits))) return false
        return true
      })
      .sort((a, b) => (sortAsc ? 1 : -1) * `${a.visit.date}${a.visit.time}`.localeCompare(`${b.visit.date}${b.visit.time}`))
  }, [rows, query, from, to, state, sign, sortAsc])

  const opened = ui.emrVisitId ? rows.find((r) => r.visit.id === ui.emrVisitId) : undefined
  if (opened) return <EmrDetail key={opened.visit.id} visit={opened.visit} patient={opened.patient} onBack={() => setUI({ emrVisitId: null })} />

  const pageCount = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const printing = printId ? rows.find((r) => r.visit.id === printId) : undefined

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title="Bệnh án điện tử" />
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6 pt-1 pb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setQuery(input), setPage(1))}
              placeholder="Tìm tên, số điện thoại"
              aria-label="Tìm theo tên, số điện thoại"
              className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <DatePicker label="Từ ngày" value={from} max={to || undefined} onChange={(v) => (setFrom(v), setPage(1))} className="w-[150px]" />
          <DatePicker label="Đến ngày" value={to} min={from || undefined} onChange={(v) => (setTo(v), setPage(1))} className="w-[150px]" />
          <Select
            label="Trạng thái"
            value={state}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'open', label: 'Đang điều trị' },
              { value: 'closed', label: 'Đã đóng' },
            ]}
            onChange={(v) => (setState(v), setPage(1))}
            className="w-[150px]"
          />
          <Select
            label="Ký số"
            value={sign}
            options={[{ value: 'all', label: 'Tất cả' }, ...(['signed', 'pending', 'unsigned'] as SignStatus[]).map((s) => ({ value: s, label: SIGN_LABEL[s] }))]}
            onChange={(v) => (setSign(v), setPage(1))}
            className="w-[150px]"
          />
          <Button className="w-[74px]" onClick={() => (setQuery(input), setPage(1))}>
            Tìm
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="thin-scroll min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1000px] text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-left font-semibold">STT</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Mã bệnh án</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Họ và tên</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Ngày sinh</th>
                  <th className="px-3 py-2.5 text-left font-semibold">
                    <button type="button" onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-ink">
                      Thời gian vào <span className="text-brand-ink">{sortAsc ? '↑' : '↓'}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold">Loại bệnh án</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Trạng thái</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Ký số</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState />
                    </td>
                  </tr>
                )}
                {pageRows.map(({ visit, patient, emr }, i) => (
                  <tr key={visit.id} className="transition-colors hover:bg-brand-wash">
                    <td className="px-3 py-2.5 text-ink-3 tabular-nums">{(safePage - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setUI({ emrVisitId: visit.id })} className="font-semibold text-info-ink hover:underline tabular-nums">
                        {emrCodeOf(visit)}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-ink uppercase">{patient.fullName}</td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">
                      {formatDateVN(patient.dob)} - {ageLabel(patient.dob, visit.date)}
                    </td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">{formatDateTimeVN(emr.createdAt).replace(' ', ' - ').split(' - ').reverse().join(' - ')}</td>
                    <td className="px-3 py-2.5 text-ink-2">Bệnh án Ngoại trú chung</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap',
                          emr.closed ? 'bg-subtle text-ink-3' : 'bg-info-soft text-info-strong',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', emr.closed ? 'bg-ink-5' : 'bg-info')} />
                        {emr.closed ? 'Đã đóng' : 'Đang điều trị'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px]">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          emr.signStatus === 'signed' ? 'font-medium text-brand-ink' : emr.signStatus === 'pending' ? 'font-medium text-accent-strong' : 'text-ink-3',
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            emr.signStatus === 'signed' ? 'bg-brand' : emr.signStatus === 'pending' ? 'bg-accent' : 'bg-ink-5',
                          )}
                        />
                        {SIGN_LABEL[emr.signStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={() => setUI({ emrVisitId: visit.id })} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-subtle" aria-label="Sửa bệnh án" title="Sửa bệnh án">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu
                          align="end"
                          renderTrigger={({ ref, toggle }) => (
                            <button ref={ref} type="button" onClick={toggle} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-subtle" aria-label="Thao tác khác">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          )}
                        >
                          <MenuItem icon={<Printer className="h-3.5 w-3.5" />} onSelect={() => setPrintId(visit.id)}>
                            In bệnh án
                          </MenuItem>
                          <MenuItem icon={<Download className="h-3.5 w-3.5" />} disabled={!visit.emr} onSelect={() => setUI({ emrVisitId: visit.id })}>
                            Tải bệnh án
                          </MenuItem>
                        </DropdownMenu>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4">
            <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
          </div>
        </div>
      </div>

      <PrintPreviewModal open={!!printing} title="Bệnh án ngoại trú" onClose={() => setPrintId(null)}>
        {printing && <EmrPrintDoc visit={printing.visit} patient={printing.patient} emr={printing.emr} />}
      </PrintPreviewModal>
    </div>
  )
}
