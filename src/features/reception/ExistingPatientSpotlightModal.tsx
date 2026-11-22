import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { Portal } from '@/components/ui/Portal'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { useClinicState } from '@/store/ClinicStore'
import { formatPhone, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Patient } from '@/store/types'

interface ExistingPatientSpotlightModalProps {
  open: boolean
  onClose: () => void
  onSelectPatient: (patient: Patient) => void
  onCreateNew: (prefillQuery: string) => void
}

/**
 * Spotlight modal khi bấm "Thêm bệnh cũ (F1)"
 * - Nhập tên / số điện thoại để lọc tức thì
 * - Mũi tên Lên/Xuống chọn dòng, Enter để nhận bệnh
 * - Shift + Enter để chuyển sang Thêm bệnh mới
 */
export function ExistingPatientSpotlightModal({
  open,
  onClose,
  onSelectPatient,
  onCreateNew,
}: ExistingPatientSpotlightModalProps) {
  useOverlayBehavior(open, onClose)
  if (!open) return null
  return <SpotlightBody onClose={onClose} onSelectPatient={onSelectPatient} onCreateNew={onCreateNew} />
}

function SpotlightBody({
  onClose,
  onSelectPatient,
  onCreateNew,
}: Omit<ExistingPatientSpotlightModalProps, 'open'>) {
  const { patients } = useClinicState()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const q = normalizeText(query)
    const digits = query.replace(/\D/g, '')
    const matched = patients.filter((p) => {
      if (!q && !digits) return true
      const hay = normalizeText(`${p.fullName} ${p.code} ${p.address} ${p.province ?? ''} ${p.ward ?? ''}`)
      const phoneMatch = digits.length >= 1 && p.phone.includes(digits)
      const yearMatch = digits.length >= 2 && p.dob.slice(0, 4).includes(digits)
      return (q && hay.includes(q)) || phoneMatch || yearMatch
    })
    return matched.slice(0, 25)
  }, [patients, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      onCreateNew(query.trim())
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const picked = results[activeIndex]
      if (picked) onSelectPatient(picked)
      else onCreateNew(query.trim())
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-slate-900/55 p-4 pt-[24vh]"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tìm người bệnh cũ"
          onKeyDown={handleKeyDown}
          className="w-full max-w-[500px] animate-pop-in overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {/* Thanh tìm kiếm */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, số điện thoại người bệnh..."
              aria-label="Tìm tên, số điện thoại người bệnh"
              className="w-full bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Kết quả */}
          <div className="thin-scroll max-h-[250px] overflow-y-auto p-1.5">
            {results.length > 0 ? (
              results.map((p, idx) => {
                const active = idx === activeIndex
                const birthYear = p.dob ? p.dob.slice(0, 4) : ''
                const addr = p.address || [p.ward, p.province].filter(Boolean).join(', ')
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => onSelectPatient(p)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-slate-100/90' : 'hover:bg-slate-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 uppercase">{p.fullName}</p>
                      <p className="mt-0.5 text-[12.5px] text-slate-600 tabular-nums">
                        {formatPhone(p.phone)}
                        {birthYear ? ` - ${birthYear}` : ''}
                      </p>
                      {addr && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{addr}</p>}
                    </div>
                    {active && (
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 font-sans text-[11px] font-medium text-slate-500 shadow-2xs">
                          Enter
                        </kbd>
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-300/80 text-white">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-7 text-center text-[13px] text-slate-500">
                Không tìm thấy hồ sơ người bệnh phù hợp.
              </div>
            )}
          </div>

          {/* Chân modal: Shift + Enter Thêm bệnh mới */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              type="button"
              onClick={() => onCreateNew(query.trim())}
              className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-800 transition hover:text-blue-600"
            >
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-sans text-[11px] font-medium text-slate-600">
                Shift + Enter
              </kbd>
              <span>Thêm bệnh mới</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
