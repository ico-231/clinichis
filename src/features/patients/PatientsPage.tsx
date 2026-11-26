import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Eye, MoreHorizontal, Pencil, PlusCircle, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { DatePicker } from '@/components/ui/DatePicker'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { GENDER_LABEL } from '@/store/catalog'
import { addDays, ageInYears, ageLabel, formatDateVN, todayISO } from '@/lib/date'
import { formatPhone, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PatientFormDrawer } from './PatientFormDrawer'
import { PatientProfile } from './PatientProfile'
import type { Patient } from '@/store/types'
import { patientDeleteBlock } from '@/store/billing'

type SortKey = 'code' | 'name' | 'dob' | 'age' | 'address' | 'lastVisit' | 'created'

/** Quản lý người bệnh (ảnh 102, 105) */
export function PatientsPage() {
  const { patients, visits, ui } = useClinicState()
  const { deletePatient, setUI } = useClinicActions()
  const tryDelete = (p: Patient) => {
    const block = patientDeleteBlock(visits.filter((v) => v.patientId === p.id))
    if (block) toast({ title: 'Không thể xoá hồ sơ', description: block, tone: 'warning' })
    else setDeleting(p)
  }
  const toast = useToast()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(() => addDays(todayISO(), -60))
  const [to, setTo] = useState(todayISO)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'lastVisit', dir: -1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [formFor, setFormFor] = useState<Patient | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const openId = ui.patientId ?? null
  const setOpenId = (id: string | null) => setUI({ patientId: id })

  const lastVisit = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of visits) if (v.status !== 'cancelled' && v.status !== 'registered') m.set(v.patientId, [m.get(v.patientId) ?? '', `${v.date} ${v.time}`].sort().pop()!)
    return m
  }, [visits])

  const rows = useMemo(() => {
    const q = normalizeText(query)
    const digits = q.replace(/\D/g, '')
    const list = patients.filter((p) => {
      const created = p.createdAt.slice(0, 10)
      const lv = lastVisit.get(p.id)?.slice(0, 10)
      const inRange = (d?: string) => !!d && d >= from && d <= to
      // Có từ khoá thì tìm trên toàn bộ người bệnh (người lâu không đến khám vẫn phải tìm ra)
      if (!q && !inRange(created) && !inRange(lv)) return false
      if (q && !normalizeText(`${p.fullName} ${p.code}`).includes(q) && !(digits.length >= 3 && p.phone.includes(digits))) return false
      return true
    })
    const val = (p: Patient): string | number => {
      switch (sort.key) {
        case 'code':
          return p.code
        case 'name':
          return p.fullName
        case 'dob':
        case 'age':
          return p.dob
        case 'address':
          return p.address
        case 'lastVisit':
          return lastVisit.get(p.id) ?? ''
        default:
          return p.createdAt
      }
    }
    return list.sort((a, b) => String(val(a)).localeCompare(String(val(b)), 'vi') * (sort.key === 'age' ? -sort.dir : sort.dir))
  }, [patients, query, from, to, sort, lastVisit])

  const opened = openId ? patients.find((p) => p.id === openId) : undefined
  if (opened) return <PatientProfile patient={opened} onBack={() => setOpenId(null)} />

  const pageCount = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const header = (key: SortKey, label: string, cls = '') => (
    <th className={cn('px-3 py-2.5 text-left font-semibold', cls)}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className="flex items-center gap-1 hover:text-ink">
        {label}
        {sort.key === key ? sort.dir === 1 ? <ArrowUp className="h-3 w-3 text-brand-ink" /> : <ArrowDown className="h-3 w-3 text-brand-ink" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  )

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader
        title="Quản lý người bệnh"
        actions={
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setFormFor('new')}>
            Thêm
          </Button>
        }
      />
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6 pt-1 pb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setQuery(input), setPage(1))}
              placeholder="Tìm tên hoặc số điện thoại"
              aria-label="Tìm theo số điện thoại hoặc họ tên"
              className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <DatePicker label="Từ ngày" value={from} max={to} onChange={(v) => (setFrom(v), setPage(1))} className="w-[160px]" />
          <DatePicker label="Đến ngày" value={to} min={from} onChange={(v) => (setTo(v), setPage(1))} className="w-[160px]" />
          <Button className="w-[74px]" onClick={() => (setQuery(input), setPage(1))}>
            Tìm
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="thin-scroll min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
                <tr>
                  <th className="w-10" />
                  {header('code', 'Mã NB')}
                  {header('name', 'Họ và tên')}
                  {header('dob', 'Ngày sinh')}
                  {header('age', 'Tuổi')}
                  <th className="px-3 py-2.5 text-left font-semibold">Giới tính</th>
                  {header('address', 'Địa chỉ')}
                  {header('lastVisit', 'Tg khám gần nhất')}
                  {header('created', 'Ngày tạo')}
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
                {pageRows.map((p) => (
                  <tr key={p.id} onClick={() => setOpenId(p.id)} className="cursor-pointer transition-colors hover:bg-brand-wash">
                    <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        align="start"
                        renderTrigger={({ ref, toggle }) => (
                          <button ref={ref} type="button" onClick={toggle} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-subtle" aria-label="Thao tác">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      >
                        <MenuItem icon={<Eye className="h-3.5 w-3.5" />} onSelect={() => setOpenId(p.id)}>
                          Xem hồ sơ
                        </MenuItem>
                        <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={() => setFormFor(p)}>
                          Chỉnh sửa
                        </MenuItem>
                        <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onSelect={() => tryDelete(p)}>
                          Xoá
                        </MenuItem>
                      </DropdownMenu>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-info-ink hover:underline tabular-nums">{p.code}</td>
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold text-ink uppercase">{p.fullName}</span>
                      <span className="text-xs text-ink-3 tabular-nums">{formatPhone(p.phone)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">{formatDateVN(p.dob)}</td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">{ageInYears(p.dob) >= 2 ? `${ageInYears(p.dob)} tuổi` : ageLabel(p.dob)}</td>
                    <td className="px-3 py-2.5 text-ink-2">{GENDER_LABEL[p.gender]}</td>
                    <td className="max-w-[260px] truncate px-3 py-2.5 text-ink-2" title={p.address}>{p.address}</td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">{lastVisit.get(p.id) ? formatDateVN(lastVisit.get(p.id)!.slice(0, 10)) : '--'}</td>
                    <td className="px-3 py-2.5 text-ink-2 tabular-nums">{formatDateVN(p.createdAt.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4">
            <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
          </div>
        </div>
      </div>

      {formFor && <PatientFormDrawer patient={formFor === 'new' ? undefined : formFor} onClose={() => setFormFor(null)} />}
      <ConfirmDiscardModal
        open={!!deleting}
        title="Bạn có chắc muốn xoá?"
        description={deleting ? `Xoá hồ sơ ${deleting.fullName}${visits.some((v) => v.patientId === deleting.id) ? ' cùng các lượt đăng ký chưa khám' : ''}. Không thể hoàn tác.` : ''}
        cancelLabel="Huỷ"
        confirmLabel="Xác nhận"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deletePatient(deleting.id)
            toast({ title: 'Đã xoá người bệnh', description: deleting.fullName, tone: 'success' })
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
