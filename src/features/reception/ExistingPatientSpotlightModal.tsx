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
 * Spotlight modal khi bấm "Thêm bệnh cũ"
 * - Nhập tên / số điện thoại để lọc tức thì
 * - Mũi tên Lên/Xuống chọn dòng, Enter để nhận bệnh
 * - Nút "Thêm bệnh mới" ở chân modal để chuyển sang tạo hồ sơ mới
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
    if (!q && !digits) return patients.slice(0, 25)
    // Xếp hạng: trùng đầu một chữ trong tên > có trong tên > mã / SĐT > năm sinh > địa chỉ
    const ranked: { p: (typeof patients)[number]; rank: number }[] = []
    for (const p of patients) {
      const name = normalizeText(p.fullName)
      const place = normalizeText(`${p.address} ${p.province ?? ''} ${p.ward ?? ''}`)
      let rank = -1
      if (q && name.split(/\s+/).some((w) => w.startsWith(q))) rank = 0
      else if (q && name.includes(q)) rank = 1
      else if ((q && normalizeText(p.code).includes(q)) || (digits.length >= 1 && p.phone.includes(digits))) rank = 2
      else if (digits.length >= 2 && p.dob.slice(0, 4).includes(digits)) rank = 3
      else if (q && place.includes(q)) rank = 4
      if (rank >= 0) ranked.push({ p, rank })
    }
    ranked.sort((a, b) => a.rank - b.rank || a.p.fullName.localeCompare(b.p.fullName, 'vi'))
    return ranked.slice(0, 25).map((r) => r.p)
  }, [patients, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-overlay/35 p-4 pt-[24vh]"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tìm người bệnh cũ"
          onKeyDown={handleKeyDown}
          className="w-full max-w-[500px] animate-pop-in overflow-hidden rounded-[18px] border border-line bg-surface shadow-pop"
        >
          {/* Thanh tìm kiếm */}
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, số điện thoại người bệnh..."
              aria-label="Tìm tên, số điện thoại người bệnh"
              className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3/60"
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
                      'flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-brand-soft/60' : 'hover:bg-subtle',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink uppercase">{p.fullName}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-3 tabular-nums">
                        {formatPhone(p.phone)}
                        {birthYear ? ` - ${birthYear}` : ''}
                      </p>
                      {addr && <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{addr}</p>}
                    </div>
                    {active && (
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-line-strong/80 text-white">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-7 text-center text-[13px] text-ink-4">
                Không tìm thấy hồ sơ người bệnh phù hợp.
              </div>
            )}
          </div>

          {/* Chân modal: nút Thêm bệnh mới */}
          <div className="border-t border-line-soft px-4 py-2.5">
            <button
              type="button"
              onClick={() => onCreateNew(query.trim())}
              className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink transition hover:text-brand-ink"
            >
              <span>Thêm bệnh mới</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
