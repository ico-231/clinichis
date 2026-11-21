import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { VisitStatusIcon } from '@/components/clinic/StatusBadges'
import { VISIT_STATUS_FILTER } from '@/store/catalog'
import { cn } from '@/lib/cn'
import { RECEPTION_COLUMNS, type ReceptionColumn } from './columns'
import { STATUS_ACTIONS } from './visitFlow'
import type { VisitRow } from '@/store/selectors'
import type { ReceptionColumnKey, ReceptionViewState, VisitStatus } from '@/store/types'

interface ReceptionTableProps {
  rows: VisitRow[]
  visibleColumns: ReceptionColumnKey[]
  sort: ReceptionViewState['sort']
  onSort: (key: ReceptionColumnKey) => void
  highlightId: string | null
  onOpen: (visitId: string) => void
  onChangeStatus: (row: VisitRow, nextStatus: VisitStatus) => void
  onPay: (visitId: string) => void
  emptyAction?: React.ReactNode
}

const FIXED_LEFT = [
  { key: 'status', label: 'Trạng thái', width: 192 },
  { key: 'code', label: 'Mã KB', width: 176 },
]

export function ReceptionTable({
  rows,
  visibleColumns,
  sort,
  onSort,
  highlightId,
  onOpen,
  onChangeStatus,
  onPay,
  emptyAction,
}: ReceptionTableProps) {
  const columns = RECEPTION_COLUMNS.filter((c) => visibleColumns.includes(c.key))
  const totalWidth = FIXED_LEFT.reduce((s, c) => s + c.width, 0) + columns.reduce((s, c) => s + c.width, 0)

  const th = 'h-[38px] border-r border-slate-200 px-2.5 text-left text-[13px] font-medium whitespace-nowrap text-slate-700 last:border-r-0'

  return (
    <div className="thin-scroll relative h-full overflow-auto">
      <table className="min-w-full table-fixed border-separate border-spacing-0" style={{ width: totalWidth }}>
        <colgroup>
          {FIXED_LEFT.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            {FIXED_LEFT.map((c) => (
              <th key={c.key} className={cn(th, 'border-b')}>
                {c.label}
              </th>
            ))}
            {columns.map((c) => (
              <HeaderCell key={c.key} column={c} sort={sort} onSort={onSort} className={cn(th, 'border-b')} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { visit } = row
            const highlighted = visit.id === highlightId
            const currentStatusLabel =
              VISIT_STATUS_FILTER.find((s) => s.value === visit.status)?.label ?? 'Đã đăng ký khám'
            const td = cn(
              'h-[40px] border-r border-b border-slate-100 px-2.5 py-1.5 text-[13px] text-slate-800 transition-colors last:border-r-0',
              highlighted ? 'bg-blue-50/80' : 'group-hover:bg-slate-50/80',
            )
            return (
              <tr key={visit.id} onClick={() => onOpen(visit.id)} className={cn('group cursor-pointer', visit.status === 'cancelled' && 'text-slate-400')}>
                {/* Cột Trạng thái: pill dropdown đổi trạng thái trực tiếp */}
                <td className={td} onClick={(e) => e.stopPropagation()}>
                  {STATUS_ACTIONS[visit.status].length === 0 ? (
                    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 text-[12px] font-medium whitespace-nowrap text-slate-800">
                      <VisitStatusIcon status={visit.status} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{currentStatusLabel}</span>
                    </span>
                  ) : (
                    <DropdownMenu
                      align="start"
                      className="w-44"
                      renderTrigger={({ ref, toggle, open }) => (
                        <button
                          ref={ref}
                          type="button"
                          onClick={toggle}
                          className={cn(
                            'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 text-[12px] font-medium whitespace-nowrap text-slate-800 transition hover:border-slate-300 hover:bg-slate-100',
                            open && 'border-blue-400 ring-2 ring-blue-500/15',
                          )}
                        >
                          <VisitStatusIcon status={visit.status} className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{currentStatusLabel}</span>
                          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                        </button>
                      )}
                    >
                      {STATUS_ACTIONS[visit.status].map((act) => (
                        <MenuItem key={act.to} icon={<VisitStatusIcon status={act.to} />} danger={act.to === 'cancelled'} onSelect={() => onChangeStatus(row, act.to)}>
                          {act.label}
                        </MenuItem>
                      ))}
                    </DropdownMenu>
                  )}
                </td>

                {/* Cột Mã KB */}
                <td className={td}>
                  <span className="font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 tabular-nums group-hover:decoration-blue-600">
                    {visit.code}
                  </span>
                </td>

                {columns.map((c) => (
                  <td
                    key={c.key}
                    onClick={
                      c.key === 'payment' && (visit.paymentStatus === 'unpaid' || visit.paymentStatus === 'partial')
                        ? (e) => {
                            e.stopPropagation()
                            onPay(visit.id)
                          }
                        : undefined
                    }
                    title={
                      c.key === 'payment' && (visit.paymentStatus === 'unpaid' || visit.paymentStatus === 'partial')
                        ? 'Bấm để thu tiền'
                        : undefined
                    }
                    className={cn(
                      td,
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      visit.status === 'cancelled' && 'opacity-60',
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="sticky left-0 flex w-full justify-center pt-3">
          <EmptyState description="Không có lượt khám phù hợp với bộ lọc hiện tại." action={emptyAction} />
        </div>
      )}
    </div>
  )
}

function HeaderCell({ column, sort, onSort, className }: { column: ReceptionColumn; sort: ReceptionViewState['sort']; onSort: (k: ReceptionColumnKey) => void; className: string }) {
  const active = sort?.key === column.key
  const Icon = !active ? ChevronsUpDown : sort!.direction === 'asc' ? ArrowUp : ArrowDown
  if (!column.sortable) return <th className={cn(className, column.align === 'right' && 'text-right')}>{column.label}</th>
  return (
    <th className={cn(className, 'p-0')} aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn('flex h-full w-full items-center gap-1.5 px-2.5 hover:bg-slate-50', column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-between')}
      >
        <span className={cn(active && 'text-blue-700')}>{column.label}</span>
        <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
      </button>
    </th>
  )
}
