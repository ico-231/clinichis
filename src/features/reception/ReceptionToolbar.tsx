import { useEffect, useState } from 'react'
import { ListFilter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { DropdownMenu, MenuCheckItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { Drawer } from '@/components/ui/Modal'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import {
  CATEGORY_LABEL,
  PAYMENT_STATUS,
  PAYMENT_STATUS_ORDER,
  VISIT_STATUS_FILTER,
  toOptions,
} from '@/store/catalog'
import { DEFAULT_COLUMNS } from '@/store/seed'
import { cn } from '@/lib/cn'
import { RECEPTION_COLUMNS } from './columns'
import type { ReceptionFilters } from '@/store/types'

const ALL = { value: 'all' as const, label: 'Tất cả' }

export function ReceptionToolbar() {
  const { ui } = useClinicState()
  const { setReceptionView } = useClinicActions()
  const view = ui.reception
  const { filters } = view
  const [advancedOpen, setAdvancedOpen] = useState(false)
  // Ô tìm kiếm giữ state cục bộ khi gõ (không render lại cả ứng dụng mỗi phím), chỉ ghi vào store khi áp dụng
  const [query, setQuery] = useState(view.searchInput)
  useEffect(() => setQuery(view.searchInput), [view.searchInput])

  const setFilters = (patch: Partial<ReceptionFilters>) => setReceptionView({ filters: { ...filters, ...patch }, page: 1 })
  const applySearch = () => setReceptionView({ searchInput: query, filters: { ...filters, search: query }, page: 1 })

  const advancedCount = (['category', 'source'] as const).filter((k) => filters[k] !== 'all').length

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 px-2 pt-4 pb-3">
        <div className="relative w-[236px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Tìm theo tên, số điện thoại..."
            aria-label="Tìm theo tên, số điện thoại"
            className="h-9 w-full rounded-md bg-slate-100 pr-8 pl-8 text-[13px] text-slate-900 outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setReceptionView({ searchInput: '', filters: { ...filters, search: '' }, page: 1 })
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DatePicker
          label="Từ"
          value={filters.dateFrom}
          max={filters.dateTo}
          onChange={(dateFrom) => setFilters({ dateFrom })}
          className="w-[155px]"
        />
        <DatePicker label="Đến" value={filters.dateTo} min={filters.dateFrom} onChange={(dateTo) => setFilters({ dateTo })} className="w-[155px]" />
        <Select
          label="Trạng thái"
          value={filters.status}
          options={[ALL, ...VISIT_STATUS_FILTER]}
          onChange={(status) => setFilters({ status })}
          className="w-[155px]"
        />
        <Select
          label="Thanh toán"
          value={filters.payment}
          options={[ALL, ...PAYMENT_STATUS_ORDER.map((p) => ({ value: p, label: PAYMENT_STATUS[p].label }))]}
          onChange={(payment) => setFilters({ payment })}
          className="w-[155px]"
        />

        <Button onClick={applySearch} className="w-[72px]">
          Tìm
        </Button>
        <Button
          variant="outline"
          leftIcon={<ListFilter className="h-3.5 w-3.5" />}
          onClick={() => setAdvancedOpen(true)}
          className={cn('px-3', advancedCount > 0 && 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50')}
        >
          Nâng cao
          {advancedCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[10.5px] leading-4 text-white">{advancedCount}</span>}
        </Button>

        <DropdownMenu
          align="end"
          className="w-[148px]"
          renderTrigger={({ ref, toggle, open }) => (
            <Button ref={ref} variant="outline" size="icon" onClick={toggle} className={cn(open && 'bg-slate-100')} aria-label="Ẩn/hiện cột" title="Ẩn/hiện cột">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {RECEPTION_COLUMNS.map((c) => {
              const checked = view.visibleColumns.includes(c.key)
              return (
                <MenuCheckItem
                  key={c.key}
                  checked={checked}
                  onToggle={() =>
                    setReceptionView({
                      visibleColumns: checked ? view.visibleColumns.filter((k) => k !== c.key) : [...view.visibleColumns, c.key],
                    })
                  }
                >
                  {c.menuLabel}
                </MenuCheckItem>
              )
            })}
          </div>
          <MenuSeparator />
          <button
            type="button"
            onClick={() => setReceptionView({ visibleColumns: DEFAULT_COLUMNS })}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium text-blue-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Mặc định
          </button>
        </DropdownMenu>
      </div>

      <AdvancedSearchDrawer open={advancedOpen} onClose={() => setAdvancedOpen(false)} filters={filters} onApply={setFilters} />
    </>
  )
}

type AdvancedKeys = Pick<ReceptionFilters, 'category' | 'source'>
const EMPTY_ADVANCED: AdvancedKeys = { category: 'all', source: 'all' }

function AdvancedSearchDrawer({
  open,
  onClose,
  filters,
  onApply,
}: {
  open: boolean
  onClose: () => void
  filters: ReceptionFilters
  onApply: (patch: Partial<ReceptionFilters>) => void
}) {
  if (!open) return null
  return <AdvancedSearchForm onClose={onClose} filters={filters} onApply={onApply} />
}

function AdvancedSearchForm({ onClose, filters, onApply }: { onClose: () => void; filters: ReceptionFilters; onApply: (patch: Partial<ReceptionFilters>) => void }) {
  const [draft, setDraft] = useState<AdvancedKeys>({
    category: filters.category,
    source: filters.source,
  })
  const set = (patch: Partial<AdvancedKeys>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Drawer open onClose={onClose} title="Tìm kiếm nâng cao">
      <div className="space-y-5 px-4 pt-3 pb-4">
        <Select label="Phân loại" value={draft.category} options={[ALL, ...toOptions(CATEGORY_LABEL)]} onChange={(category) => set({ category })} />
        <Select
          label="Nguồn"
          value={draft.source}
          options={[ALL, { value: 'onsite', label: 'Tại phòng khám' }, { value: 'external', label: 'Bên ngoài' }]}
          onChange={(source) => set({ source })}
        />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            Áp dụng
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(EMPTY_ADVANCED)
              onApply(EMPTY_ADVANCED)
            }}
          >
            Đặt lại
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
