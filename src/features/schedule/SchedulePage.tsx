import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { toISODate, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'
import { KIND_LABEL, LeaveModal, newSlotId, SlotChip, SlotEditModal, WEEKDAY_LABEL, WeeklySetupModal } from './scheduleModals'
import type { FixedSlot, FlexSlot, LeaveSlot, Schedules } from '@/store/types'

type Tab = 'fixed' | 'leave' | 'flex'
const EMPTY: Schedules = { fixed: [], leaves: [], flexible: [] }

const TABS: { value: Tab; label: string }[] = [
  { value: 'fixed', label: 'Lịch cố định' },
  { value: 'leave', label: 'Lịch nghỉ' },
  { value: 'flex', label: 'Lịch làm việc linh hoạt' },
]

/** Thông báo hồ sơ đang chờ duyệt (ảnh 074–077) */
export function PendingProfileBanner() {
  const { clinicProfile } = useClinicState()
  if (clinicProfile?.status !== 'pending') return null
  return (
    <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 2xl:px-8 pb-2">
      <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-accent-line bg-accent-tint px-3.5 py-2 text-[12.5px] text-accent-strong">
        <AlertTriangle className="h-4 w-4 shrink-0 text-accent-ink" />
        <span>
          <b>Hồ sơ phòng khám đang chờ phê duyệt.</b> Sau khi được duyệt, hồ sơ sẽ hiển thị công khai để người bệnh tìm kiếm và đặt lịch. Trong thời gian chờ, bạn vẫn có thể thiết lập lịch làm việc.
        </span>
      </div>
    </div>
  )
}

/** Lịch làm việc: cố định / nghỉ / linh hoạt (ảnh 075–086) */
export function SchedulePage() {
  const { schedules } = useClinicState()
  const { setSchedules } = useClinicActions()
  const toast = useToast()
  const sch = schedules ?? EMPTY
  const [tab, setTab] = useState<Tab>('fixed')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [editFixed, setEditFixed] = useState<FixedSlot | null>(null)
  const [editFlex, setEditFlex] = useState<{ slot: FlexSlot; isNew: boolean } | null>(null)
  const [editLeave, setEditLeave] = useState<{ leave: LeaveSlot; isNew: boolean } | null>(null)

  const save = (next: Schedules, msg: string) => {
    setSchedules(next)
    toast({ title: msg, tone: 'success' })
  }

  const openAdd = (date = todayISO()) => {
    if (tab === 'fixed') setWeeklyOpen(true)
    else if (tab === 'leave') setEditLeave({ leave: { id: newSlotId(), date, start: '', end: '', enabled: true }, isNew: true })
    else setEditFlex({ slot: { id: newSlotId(), date, kind: 'exam', start: '', end: '', perSlot: 1, slotMinutes: 30, enabled: true }, isNew: true })
  }

  /** Ô lịch tháng: bắt đầu từ Thứ 2 */
  const cells = useMemo(() => {
    const first = new Date(month.y, month.m, 1)
    const offset = (first.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(month.y, month.m, 1 - offset + i)
      return { iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === month.m }
    })
  }, [month])
  const weeks = cells[35].inMonth ? 6 : 5
  const today = todayISO()
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }))

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title="Lịch làm việc" />
      <PendingProfileBanner />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6 2xl:px-8 pt-1 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5">
          <div role="tablist" className="flex flex-wrap items-center gap-1.5">
            {TABS.map((t) => {
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    active ? 'border-brand bg-brand text-white shadow-xs' : 'border-line bg-canvas text-ink-2 hover:border-brand/40 hover:text-brand-ink',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {tab !== 'fixed' && (
              <div className="flex items-center gap-1 rounded-[10px] border border-line-strong bg-canvas p-0.5">
                <button type="button" onClick={() => shift(-1)} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-surface" aria-label="Tháng trước">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <select value={month.m} onChange={(e) => setMonth((x) => ({ ...x, m: Number(e.target.value) }))} className="h-7 bg-transparent px-1.5 text-[13px] font-semibold text-ink outline-none" aria-label="Tháng">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
                <select value={month.y} onChange={(e) => setMonth((x) => ({ ...x, y: Number(e.target.value) }))} className="h-7 bg-transparent px-1.5 text-[13px] font-semibold text-ink outline-none tabular-nums" aria-label="Năm">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <button type="button" onClick={() => shift(1)} className="rounded-[8px] p-1.5 text-ink-2 hover:bg-surface" aria-label="Tháng sau">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-4 text-[12px] font-medium text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" /> {KIND_LABEL.exam}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-info" /> {KIND_LABEL.online}
              </span>
              {tab === 'leave' && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Lịch nghỉ
                </span>
              )}
            </div>

            <Button size="sm" onClick={() => openAdd()}>
              {tab === 'fixed' ? 'Điều chỉnh' : 'Thêm mới'}
            </Button>
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-auto rounded-[16px] border border-line bg-surface">
          {tab === 'fixed' ? (
            <div className="grid h-full min-w-[920px] grid-cols-7">
              {WEEKDAY_LABEL.map((l, wd) => (
                <div key={l} className="flex min-w-0 flex-col border-r border-line last:border-r-0">
                  <div className="border-b border-line bg-subtle py-2.5 text-center text-[12px] font-semibold tracking-[0.02em] text-ink-3 uppercase">{l}</div>
                  <div className="thin-scroll flex-1 space-y-1.5 overflow-y-auto p-2">
                    {sch.fixed
                      .filter((s) => s.weekday === wd)
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((s) => (
                        <div key={s.id} className={cn(!s.enabled && 'opacity-50')}>
                          <SlotChip kind={s.kind} label={`${KIND_LABEL[s.kind]}${s.enabled ? '' : ' (tắt)'}`} time={`${s.start} - ${s.end}`} onClick={() => setEditFixed(s)} />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-w-[920px] flex-col">
              <div className="grid grid-cols-7 border-b border-line bg-subtle text-[12px] font-semibold tracking-[0.02em] text-ink-3 uppercase">
                {WEEKDAY_LABEL.map((l) => (
                  <div key={l} className="border-r border-line py-2.5 text-center last:border-r-0">
                    {l}
                  </div>
                ))}
              </div>
              <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
                {cells.slice(0, weeks * 7).map((c) => {
                  const items = tab === 'leave' ? sch.leaves.filter((l) => l.date === c.iso) : sch.flexible.filter((f) => f.date === c.iso)
                  const isToday = c.iso === today
                  return (
                    <div
                      key={c.iso}
                      role="button"
                      tabIndex={0}
                      onClick={() => c.iso >= today && openAdd(c.iso)}
                      onKeyDown={(e) => e.key === 'Enter' && c.iso >= today && openAdd(c.iso)}
                      className={cn(
                        'thin-scroll min-h-[78px] overflow-y-auto border-r border-b border-line p-1.5 text-right text-[12px] transition-colors [&:nth-child(7n)]:border-r-0',
                        isToday && 'bg-accent-tint',
                        !c.inMonth && !isToday && 'bg-canvas/70 text-ink-5',
                        c.iso < today ? 'cursor-default bg-canvas/60' : 'cursor-pointer hover:bg-brand-wash',
                      )}
                      aria-label={`Ngày ${c.day}${c.iso >= today ? ' – bấm để thêm lịch' : ''}`}
                    >
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums',
                            isToday ? 'bg-accent text-white' : c.inMonth ? 'text-ink-2' : 'text-ink-5',
                          )}
                        >
                          {c.day}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1 text-left">
                        {tab === 'leave'
                          ? (items as LeaveSlot[]).map((l) => (
                              <div key={l.id} className={cn(!l.enabled && 'opacity-50')}>
                                <SlotChip tone="leave" label="Lịch nghỉ" time={`${l.start} - ${l.end}`} onClick={() => setEditLeave({ leave: l, isNew: false })} />
                              </div>
                            ))
                          : (items as FlexSlot[]).map((f) => (
                              <div key={f.id} className={cn(!f.enabled && 'opacity-50')}>
                                <SlotChip kind={f.kind} label={KIND_LABEL[f.kind]} time={`${f.start} - ${f.end}`} onClick={() => setEditFlex({ slot: f, isNew: false })} />
                              </div>
                            ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {weeklyOpen && (
        <WeeklySetupModal
          initial={sch.fixed}
          onClose={() => setWeeklyOpen(false)}
          onApply={(fixed) => {
            save({ ...sch, fixed }, 'Đã cập nhật lịch cố định')
            setWeeklyOpen(false)
          }}
        />
      )}
      {editFixed && (
        <SlotEditModal
          title="Điều chỉnh lịch làm việc cố định"
          slot={editFixed}
          others={sch.fixed.filter((s) => s.weekday === editFixed.weekday && s.kind === editFixed.kind && s.enabled)}
          onClose={() => setEditFixed(null)}
          onDelete={() => {
            save({ ...sch, fixed: sch.fixed.filter((s) => s.id !== editFixed.id) }, 'Đã xoá khung giờ')
            setEditFixed(null)
          }}
          onSave={(s) => {
            save({ ...sch, fixed: sch.fixed.map((x) => (x.id === s.id ? (s as FixedSlot) : x)) }, 'Đã cập nhật khung giờ')
            setEditFixed(null)
          }}
        />
      )}
      {editFlex && (
        <SlotEditModal
          title={editFlex.isNew ? 'Thêm lịch làm việc linh hoạt' : 'Điều chỉnh lịch làm việc linh hoạt'}
          slot={editFlex.slot}
          others={sch.flexible.filter((f) => f.date === editFlex.slot.date && f.enabled)}
          onClose={() => setEditFlex(null)}
          onDelete={editFlex.isNew ? undefined : () => (save({ ...sch, flexible: sch.flexible.filter((f) => f.id !== editFlex.slot.id) }, 'Đã xoá lịch linh hoạt'), setEditFlex(null))}
          onSave={(s) => {
            const f = s as FlexSlot
            save({ ...sch, flexible: editFlex.isNew ? [...sch.flexible, f] : sch.flexible.map((x) => (x.id === f.id ? f : x)) }, editFlex.isNew ? 'Đã thêm lịch linh hoạt' : 'Đã cập nhật lịch linh hoạt')
            setEditFlex(null)
          }}
        />
      )}
      {editLeave && (
        <LeaveModal
          leave={editLeave.leave}
          onClose={() => setEditLeave(null)}
          onDelete={editLeave.isNew ? undefined : () => (save({ ...sch, leaves: sch.leaves.filter((l) => l.id !== editLeave.leave.id) }, 'Đã xoá lịch nghỉ'), setEditLeave(null))}
          onSave={(l) => {
            save({ ...sch, leaves: editLeave.isNew ? [...sch.leaves, l] : sch.leaves.map((x) => (x.id === l.id ? l : x)) }, editLeave.isNew ? 'Đã thêm lịch nghỉ' : 'Đã cập nhật lịch nghỉ')
            setEditLeave(null)
          }}
        />
      )}
    </div>
  )
}
