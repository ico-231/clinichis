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
    <div className="flex h-full flex-col">
      <PageHeader title="Bệnh án điện tử" />
      <div className="flex min-h-0 flex-1 flex-col px-2">
        <div className="flex flex-wrap items-end gap-2 px-2 pt-4 pb-3">
          <div className="relative w-[240px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setQuery(input), setPage(1))}
              placeholder="Tìm theo tên, số điện thoại"
              className="h-9 w-full rounded-md bg-slate-100 pr-3 pl-8 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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
            className="w-[140px]"
          />
          <Select
            label="Ký số"
            value={sign}
            options={[{ value: 'all', label: 'Tất cả' }, ...(['signed', 'pending', 'unsigned'] as SignStatus[]).map((s) => ({ value: s, label: SIGN_LABEL[s] }))]}
            onChange={(v) => (setSign(v), setPage(1))}
            className="w-[140px]"
          />
          <Button leftIcon={<Search className="h-3.5 w-3.5" />} onClick={() => (setQuery(input), setPage(1))}>
            Tìm kiếm
          </Button>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[1000px] text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[12.5px] text-slate-600">
              <tr>
                <th className="w-12 px-2 py-2.5 text-left font-medium">STT</th>
                <th className="px-2 py-2.5 text-left font-medium">Mã bệnh án</th>
                <th className="px-2 py-2.5 text-left font-medium">Họ và tên</th>
                <th className="px-2 py-2.5 text-left font-medium">Ngày sinh</th>
                <th className="px-2 py-2.5 text-left font-medium">
                  <button type="button" onClick={() => setSortAsc((s) => !s)} className="hover:text-slate-900">
                    Thời gian vào {sortAsc ? '↑' : '↓'}
                  </button>
                </th>
                <th className="px-2 py-2.5 text-left font-medium">Loại bệnh án</th>
                <th className="px-2 py-2.5 text-left font-medium">Trạng thái</th>
                <th className="px-2 py-2.5 text-left font-medium">Ký số</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState />
                  </td>
                </tr>
              )}
              {pageRows.map(({ visit, patient, emr }, i) => (
                <tr key={visit.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/50')}>
                  <td className="px-2 py-2">{(safePage - 1) * pageSize + i + 1}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setUI({ emrVisitId: visit.id })} className="text-blue-600 hover:underline">
                      {emrCodeOf(visit)}
                    </button>
                  </td>
                  <td className="px-2 py-2 font-semibold uppercase">{patient.fullName}</td>
                  <td className="px-2 py-2">
                    {formatDateVN(patient.dob)} - {ageLabel(patient.dob, visit.date)}
                  </td>
                  <td className="px-2 py-2">{formatDateTimeVN(emr.createdAt).replace(' ', ' - ').split(' - ').reverse().join(' - ')}</td>
                  <td className="px-2 py-2">Bệnh án Ngoại trú chung</td>
                  <td className="px-2 py-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[12px]', emr.closed ? 'border-slate-300 bg-slate-50 text-slate-600' : 'border-orange-300 bg-orange-50 text-orange-700')}>
                      {emr.closed ? 'Đã đóng' : '◌ Đang điều trị'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-[12.5px]">
                    <span className={cn('flex items-center gap-1', emr.signStatus !== 'signed' && 'text-slate-500')}>
                      <span className={cn('h-2 w-2 rounded-full border', emr.signStatus === 'signed' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400')} />
                      {SIGN_LABEL[emr.signStatus]}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="inline-flex gap-1">
                      <button type="button" onClick={() => setUI({ emrVisitId: visit.id })} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="Sửa bệnh án" title="Sửa bệnh án">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <DropdownMenu
                        align="end"
                        renderTrigger={({ ref, toggle }) => (
                          <button ref={ref} type="button" onClick={toggle} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="Thao tác khác">
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
        <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
      </div>

      <PrintPreviewModal open={!!printing} title="Bệnh án ngoại trú" onClose={() => setPrintId(null)}>
        {printing && <EmrPrintDoc visit={printing.visit} patient={printing.patient} emr={printing.emr} />}
      </PrintPreviewModal>
    </div>
  )
}
