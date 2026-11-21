import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Kbd } from '@/components/ui/Button'
import { hasOpenOverlay } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { toISODate, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'
import { KIND_LABEL, LeaveModal, newSlotId, SlotChip, SlotEditModal, WEEKDAY_LABEL, WeeklySetupModal } from './scheduleModals'
import type { FixedSlot, FlexSlot, LeaveSlot, Schedules } from '@/store/types'

type Tab = 'fixed' | 'leave' | 'flex'
const EMPTY: Schedules = { fixed: [], leaves: [], flexible: [] }

/** Thông báo hồ sơ đang chờ duyệt (ảnh 074–077) */
export function PendingProfileBanner() {
  const { clinicProfile } = useClinicState()
  if (clinicProfile?.status !== 'pending') return null
  return (
    <div className="mx-3 mt-3 flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[12.5px] text-orange-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <b>Hồ sơ phòng khám đang chờ phê duyệt.</b> Sau khi được duyệt, hồ sơ sẽ hiển thị công khai để người bệnh tìm kiếm và đặt lịch. Trong thời gian chờ, bạn vẫn có thể thiết lập lịch làm việc.
      </span>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !hasOpenOverlay()) {
        e.preventDefault()
        openAdd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
    <div className="flex h-full flex-col">
      <PageHeader title="Lịch làm việc" />
      <PendingProfileBanner />
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
        <Tabs
          variant="pill"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'fixed', label: 'Lịch cố định' },
            { value: 'leave', label: 'Lịch nghỉ' },
            { value: 'flex', label: 'Lịch làm việc linh hoạt' },
          ]}
        />
        <span className="ml-auto" />
        <Button onClick={() => openAdd()} rightIcon={<Kbd tone="blue">F2</Kbd>}>
          {tab === 'fixed' ? 'Điều chỉnh' : 'Thêm mới'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {tab !== 'fixed' && (
          <>
            <button type="button" onClick={() => shift(-1)} className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50" aria-label="Tháng trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select value={month.m} onChange={(e) => setMonth((x) => ({ ...x, m: Number(e.target.value) }))} className="h-8 rounded-md border border-slate-200 px-2 text-[13px]" aria-label="Tháng">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
            <select value={month.y} onChange={(e) => setMonth((x) => ({ ...x, y: Number(e.target.value) }))} className="h-8 rounded-md border border-slate-200 px-2 text-[13px]" aria-label="Năm">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={() => shift(1)} className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50" aria-label="Tháng sau">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        <span className="ml-auto flex items-center gap-4 text-[12px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> {KIND_LABEL.exam}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {KIND_LABEL.online}
          </span>
          {tab === 'leave' && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Lịch nghỉ
            </span>
          )}
        </span>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        {tab === 'fixed' ? (
          <div className="grid h-full grid-cols-7 overflow-hidden rounded-lg border border-slate-200">
            {WEEKDAY_LABEL.map((l, wd) => (
              <div key={l} className="flex min-w-0 flex-col border-r border-slate-200 last:border-r-0">
                <div className="border-b border-slate-200 bg-slate-50 py-2 text-center text-[13px] font-semibold">{l}</div>
                <div className="thin-scroll flex-1 space-y-1 overflow-y-auto p-1">
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
          <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-[13px] font-semibold">
              {WEEKDAY_LABEL.map((l) => (
                <div key={l} className="py-2 text-center">
                  {l}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
              {cells.slice(0, weeks * 7).map((c) => {
                const items = tab === 'leave' ? sch.leaves.filter((l) => l.date === c.iso) : sch.flexible.filter((f) => f.date === c.iso)
                return (
                  <div
                    key={c.iso}
                    role="button"
                    tabIndex={0}
                    onClick={() => c.iso >= today && openAdd(c.iso)}
                    onKeyDown={(e) => e.key === 'Enter' && c.iso >= today && openAdd(c.iso)}
                    className={cn(
                      'thin-scroll min-h-[72px] overflow-y-auto border-r border-b border-slate-100 p-1 text-right text-[12px] [&:nth-child(7n)]:border-r-0',
                      c.iso === today && 'bg-amber-50',
                      !c.inMonth && 'text-slate-300',
                      c.iso < today ? 'cursor-default bg-slate-50/50' : 'cursor-pointer hover:bg-blue-50/40',
                    )}
                    aria-label={`Ngày ${c.day}${c.iso >= today ? ' – bấm để thêm lịch' : ''}`}
                  >
                    <span className="block pr-1 font-medium">{c.day}</span>
                    <div className="mt-0.5 space-y-1 text-left">
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
