import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Select } from './Select'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({ page, pageCount, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:text-slate-300'
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 py-3">
      <p className="text-[13.5px] font-semibold text-slate-900">
        {total > 0 ? `Tổng ${total} kết quả` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 max-sm:w-full max-sm:justify-between max-sm:gap-x-3">
        <div className="flex items-center gap-3">
          <Select
            value={String(pageSize)}
            options={['10', '20', '50', '100'].map((v) => ({ value: v, label: v }))}
            onChange={(v) => onPageSizeChange(Number(v))}
            className="w-[72px]"
            triggerClassName="h-8"
          />
          <span className="text-[13px] text-slate-700 max-sm:hidden">dòng</span>
        </div>
        <span className="text-[13px] font-medium text-slate-800 tabular-nums">
          {pageCount === 0 ? 'Trang 0 / 0' : `Trang ${page}/${pageCount}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="Trang đầu">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={cn(btn)} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Trang sau">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className={btn} disabled={page >= pageCount} onClick={() => onPageChange(pageCount)} aria-label="Trang cuối">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
