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

/** Hai cột đầu ghim bên trái khi cuộn ngang (giữ ngữ cảnh khi bảng rộng hơn màn hình) */
const FIXED_LEFT = [
  { key: 'status', label: 'Trạng thái', width: 150, left: 0 },
  { key: 'code', label: 'Mã KB', width: 162, left: 150 },
]

/** Nhãn ngắn trong pill của bảng (bộ lọc phía trên vẫn dùng nhãn đầy đủ) */
const SHORT_STATUS: Partial<Record<VisitStatus, string>> = { registered: 'Đã đăng ký' }

const STATUS_PILL: Record<VisitStatus, string> = {
  registered: 'bg-warn-soft text-warn-strong hover:brightness-95',
  waiting: 'bg-accent-line text-accent-strong hover:brightness-95',
  in_progress: 'bg-info-soft text-info-strong hover:brightness-95',
  done: 'bg-brand-soft text-brand-ink',
  cancelled: 'bg-subtle text-ink-3',
}

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

  const th = 'h-[38px] px-2.5 text-left text-[12.5px] font-semibold whitespace-nowrap text-ink-3'
  const stickyTh = (i: number) => cn('sticky z-20 bg-subtle', i === FIXED_LEFT.length - 1 && 'shadow-[inset_-1px_0_0_var(--color-line)]')

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
        <thead className="sticky top-0 z-10 bg-subtle">
          <tr>
            {FIXED_LEFT.map((c, i) => (
              <th key={c.key} className={cn(th, 'border-b border-line', stickyTh(i))} style={{ left: c.left }}>
                {c.label}
              </th>
            ))}
            {columns.map((c) => (
              <HeaderCell key={c.key} column={c} sort={sort} onSort={onSort} className={cn(th, 'border-b border-line')} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { visit } = row
            const highlighted = visit.id === highlightId
            const fullStatusLabel = VISIT_STATUS_FILTER.find((s) => s.value === visit.status)?.label ?? 'Đã đăng ký khám'
            const currentStatusLabel = SHORT_STATUS[visit.status] ?? fullStatusLabel
            // Nền đặc (không trong suốt) để cột ghim che được nội dung cuộn bên dưới
            const td = cn(
              'h-[41px] border-b border-line px-2.5 py-1.5 text-[13px] text-ink transition-colors',
              highlighted ? 'bg-brand-soft' : 'bg-surface group-hover:bg-brand-wash',
            )
            const stickyTd = (i: number) => cn('sticky z-[1]', i === FIXED_LEFT.length - 1 && 'shadow-[inset_-1px_0_0_var(--color-line)]')
            return (
              <tr key={visit.id} onClick={() => onOpen(visit.id)} className={cn('group cursor-pointer', visit.status === 'cancelled' && 'text-ink-3')}>
                {/* Cột Trạng thái: pill pastel 6C */}
                <td className={cn(td, stickyTd(0))} style={{ left: FIXED_LEFT[0].left }} onClick={(e) => e.stopPropagation()} title={fullStatusLabel}>
                  {STATUS_PILL[visit.status] && STATUS_ACTIONS[visit.status].length === 0 ? (
                    <span className={cn('inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap', STATUS_PILL[visit.status])}>
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
                            'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap transition',
                            STATUS_PILL[visit.status],
                            open && 'ring-2 ring-brand/25',
                          )}
                        >
                          <VisitStatusIcon status={visit.status} className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{currentStatusLabel}</span>
                          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
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
                <td className={cn(td, stickyTd(1))} style={{ left: FIXED_LEFT[1].left }}>
                  <span className="font-medium text-info-ink tabular-nums group-hover:underline">
                    {visit.code}
                  </span>
                </td>

                {columns.map((c) => (
                  <td
                    key={c.key}
                    onClick={
                      c.key === 'payment' && visit.status !== 'cancelled' && (visit.paymentStatus === 'unpaid' || visit.paymentStatus === 'partial')
                        ? (e) => {
                            e.stopPropagation()
                            onPay(visit.id)
                          }
                        : undefined
                    }
                    title={
                      c.key === 'payment' && visit.status !== 'cancelled' && (visit.paymentStatus === 'unpaid' || visit.paymentStatus === 'partial')
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
        className={cn('flex h-full w-full items-center gap-1.5 px-2.5 hover:bg-line/60', column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-between')}
      >
        <span className={cn(active && 'text-brand-ink')}>{column.label}</span>
        <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-brand-ink' : 'text-ink-5')} />
      </button>
    </th>
  )
}
