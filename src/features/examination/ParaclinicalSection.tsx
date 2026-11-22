import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Eye, FlaskConical, MoreHorizontal, Plus, Printer, ScanLine, Send, Trash2, Wallet, Hourglass, ClipboardCheck } from 'lucide-react'
import { Button, Kbd } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { DocumentsEmptyIllustration } from '@/components/ui/EmptyState'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import { htmlToText } from '@/components/ui/RichText'
import { Section, boxInput, type DraftUpdate } from './ExamSections'
import type { ExamDraft } from './examDraft'
import type { ParaclinicalOrderItem } from '@/store/types'

interface Props {
  draft: ExamDraft
  update: DraftUpdate
  /** Chỉ định đã lưu – để phát hiện thay đổi chưa gửi */
  savedOrders: ParaclinicalOrderItem[]
  /** Chỉ định đã được thu tiền (theo dòng trên phiếu thu) */
  isPaid: (orderId: string) => boolean
  onAdd: () => void
  onViewResult: (orderId: string) => void
  onSend: () => void
  onPrint: () => void
}

const orderKey = (o: ParaclinicalOrderItem) => `${o.providerId}:${o.serviceId}:${o.quantity}`

export function ParaclinicalSection({ draft, update, savedOrders, isPaid, onAdd, onViewResult, onSend, onPrint }: Props) {
  const [tab, setTab] = useState<'orders' | 'results'>('orders')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const orders = draft.orders
  const results = orders.filter((o) => o.resultStatus === 'has_result')

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; address: string; items: ParaclinicalOrderItem[] }>()
    for (const o of orders) {
      const g = map.get(o.providerId) ?? { name: o.providerName, address: o.providerAddress, items: [] }
      g.items.push(o)
      map.set(o.providerId, g)
    }
    return [...map.entries()]
  }, [orders])

  const anySent = orders.some((o) => o.sentAt) || savedOrders.some((o) => o.sentAt)
  const changedAfterSend =
    anySent && (orders.some((o) => !o.sentAt) || savedOrders.map(orderKey).sort().join() !== orders.map(orderKey).sort().join())

  const remove = (id: string) => update({ orders: orders.filter((o) => o.id !== id) })

  return (
    <Section
      id="sec-cls"
      title={
        <span className="flex items-center gap-3">
          Cận lâm sàng
          <span className="normal-case tracking-normal">
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'orders', label: <span className="flex items-center gap-1.5">Chỉ định <Count n={orders.length} /></span> },
                { value: 'results', label: <span className="flex items-center gap-1.5">Kết quả <Count n={results.length} /></span> },
              ]}
            />
          </span>
        </span>
      }
      right={
        <>
          <Button size="sm" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={onPrint} disabled={!orders.length}>
            In phiếu chỉ định
          </Button>
          <Button
            size="sm"
            variant="soft"
            leftIcon={<Send className="h-3.5 w-3.5" />}
            rightIcon={<Kbd tone="blue">F2</Kbd>}
            onClick={onSend}
            disabled={!orders.length}
          >
            Gửi chỉ định
          </Button>
        </>
      }
    >
      {changedAfterSend && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Thông tin chỉ định cận lâm sàng đã thay đổi. Nhấn “Gửi chỉ định” hoặc “Hoàn thành” để cập nhật thông tin mới nhất đến nơi thực hiện.
        </div>
      )}

      {tab === 'results' && results.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {results.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-3 py-2">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', o.category === 'imaging' ? 'bg-violet-50 text-violet-600' : 'bg-orange-50 text-orange-700')}>
                {o.category === 'imaging' ? <ScanLine className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-900">{o.name}</span>
                <span className="block truncate text-xs text-slate-500">{o.result?.conclusion ? `Kết luận: ${htmlToText(o.result.conclusion)}` : `${o.result?.files.length ?? 0} tệp kết quả`}</span>
              </span>
              <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => onViewResult(o.id)}>
                Xem kết quả
              </Button>
            </li>
          ))}
        </ul>
      ) : tab === 'results' ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-200 py-6 text-center">
          <DocumentsEmptyIllustration />
          <p className="text-[13px] font-medium text-slate-700">Chưa có kết quả cận lâm sàng</p>
          <p className="max-w-md text-xs text-slate-500">Kết quả sẽ hiển thị khi phòng xét nghiệm / chẩn đoán hình ảnh trả kết quả cho các chỉ định đã gửi.</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <DocumentsEmptyIllustration />
          <p className="text-[13px] text-slate-600">Chưa có chỉ định cận lâm sàng. Thêm chỉ định để bắt đầu.</p>
          <Button size="sm" variant="soft" leftIcon={<Plus className="h-3.5 w-3.5" />} rightIcon={<Kbd tone="blue">Shift + C</Kbd>} onClick={onAdd}>
            Thêm chỉ định
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-[1fr_170px_120px] bg-slate-50 px-3 py-2 text-[12.5px] font-medium text-slate-500">
              <span>Tên chỉ định</span>
              <span>Trạng thái</span>
              <span className="text-right">Thao tác</span>
            </div>
            {groups.map(([pid, g]) => {
              const isCollapsed = collapsed.has(pid)
              const subtotal = g.items.reduce((s, o) => s + o.unitPrice * o.quantity, 0)
              const done = g.items.filter((o) => o.resultStatus === 'has_result').length
              return (
                <div key={pid} className="border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((s) => {
                        const n = new Set(s)
                        if (n.has(pid)) n.delete(pid)
                        else n.add(pid)
                        return n
                      })
                    }
                    className="flex w-full items-center gap-2 bg-slate-50/60 px-3 py-2 text-left"
                  >
                    <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', isCollapsed && '-rotate-90')} />
                    <span className="flex-1 text-[13px] font-semibold text-slate-900">
                      {g.name}
                      <span className="ml-2 text-xs font-normal text-slate-500">{g.address}</span>
                    </span>
                    <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 sm:block">
                      <span className="block h-full bg-blue-500" style={{ width: `${(done / g.items.length) * 100}%` }} />
                    </span>
                    <span className="text-xs text-slate-500">
                      {done}/{g.items.length} hoàn thành · Tạm tính: <b className="text-slate-800">{formatMoney(subtotal)}</b>
                    </span>
                  </button>
                  {!isCollapsed &&
                    g.items.map((o) => (
                      <div key={o.id} className="grid grid-cols-[1fr_170px_120px] items-center border-t border-slate-100 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              o.category === 'imaging' ? 'bg-violet-50 text-violet-600' : 'bg-orange-50 text-orange-700',
                            )}
                          >
                            {o.category === 'imaging' ? <ScanLine className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-slate-900">
                              {o.name}
                              {o.quantity > 1 && <span className="ml-1 text-slate-500">×{o.quantity}</span>}
                            </p>
                            <p className="text-[12.5px] text-emerald-700">{formatMoney(o.unitPrice * o.quantity)}</p>
                            {o.instruction && <p className="truncate text-xs text-slate-500">HD: {o.instruction}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <Pill tone={isPaid(o.id) ? 'green' : 'orange'} icon={<Wallet className="h-3 w-3" />}>
                            {isPaid(o.id) ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </Pill>
                          {o.resultStatus === 'has_result' ? (
                            <Pill tone="green" icon={<ClipboardCheck className="h-3 w-3" />}>
                              Có kết quả
                            </Pill>
                          ) : (
                            <Pill tone="orange" icon={<Hourglass className="h-3 w-3" />}>
                              {o.sentAt ? 'Chờ kết quả' : 'Chưa gửi'}
                            </Pill>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" disabled={o.resultStatus !== 'has_result'} onClick={() => onViewResult(o.id)} leftIcon={<Eye className="h-3.5 w-3.5" />}>
                            Xem kết quả
                          </Button>
                          <DropdownMenu
                            align="end"
                            renderTrigger={({ ref, toggle }) => (
                              <Button ref={ref} size="icon-sm" variant="outline" onClick={toggle} aria-label="Thao tác chỉ định">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          >
                            <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} danger disabled={o.resultStatus === 'has_result' || o.performStatus === 'in_progress' || o.performStatus === 'done' || isPaid(o.id)} onSelect={() => remove(o.id)}>
                              Xoá chỉ định
                            </MenuItem>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>

          <label className="mt-2 flex items-center gap-3">
            <span className="shrink-0 text-[13px] text-slate-700">Ghi chú cho phòng lab</span>
            <input value={draft.labNote} onChange={(e) => update({ labNote: e.target.value })} placeholder="Nhập ghi chú" className={cn(boxInput, 'h-9')} />
          </label>

          <button
            type="button"
            onClick={onAdd}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-2.5 text-[13px] font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50/40"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white">
              <Plus className="h-3.5 w-3.5" />
            </span>
            Thêm chỉ định
            <Kbd tone="blue">Shift + C</Kbd>
          </button>
        </>
      )}
    </Section>
  )
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-slate-200/80 px-1.5 text-[11px] text-slate-600">{n}</span>
}

function Pill({ tone, icon, children }: { tone: 'green' | 'orange'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium',
        tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700',
      )}
    >
      {icon}
      {children}
    </span>
  )
}
