import { useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  FlaskConical,
  Layers,
  Minus,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Lock,
  X,
} from 'lucide-react'
import { Portal } from '@/components/ui/Portal'
import { Popover } from '@/components/ui/Popover'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { PARACLINICAL_PROVIDERS, PARACLINICAL_SERVICES, SAMPLE_PROVIDER_ID, providerById } from '@/store/paraclinicalCatalog'
import { formatMoney, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { ParaclinicalCombo, ParaclinicalOrderItem, ParaclinicalServiceItem } from '@/store/types'

type TabKey = 'all' | 'imaging' | 'lab' | 'combo'

interface ParaclinicalOrderModalProps {
  open: boolean
  initialOrders: ParaclinicalOrderItem[]
  onClose: () => void
  onConfirm: (orders: ParaclinicalOrderItem[]) => void
  /** Chỉ định không được xoá / đổi số lượng (đã thu tiền, đang làm, đã có kết quả) kèm lý do */
  locked?: Map<string, string>
}

const serializeOrders = (orders: ParaclinicalOrderItem[]) =>
  JSON.stringify(
    orders.map((o) => ({
      serviceId: o.serviceId,
      providerId: o.providerId,
      quantity: o.quantity,
      instruction: o.instruction.trim(),
    })),
  )

export function ParaclinicalOrderModal(props: ParaclinicalOrderModalProps) {
  if (!props.open) return null
  return <ParaclinicalModalContent {...props} />
}

const NO_LOCKS = new Map<string, string>()

function ParaclinicalModalContent({ initialOrders, onClose, onConfirm, locked = NO_LOCKS }: ParaclinicalOrderModalProps) {
  const { defaultProviderId, paraclinicalCombos } = useClinicState()
  const { setDefaultProvider, saveParaclinicalCombo } = useClinicActions()
  const toast = useToast()

  const [providerId, setProviderId] = useState<string>(
    () => initialOrders[0]?.providerId || defaultProviderId || PARACLINICAL_PROVIDERS[0].id,
  )
  const [providerMenuOpen, setProviderMenuOpen] = useState(false)
  const [providerQuery, setProviderQuery] = useState('')
  const providerTriggerRef = useRef<HTMLButtonElement>(null)

  const [serviceQuery, setServiceQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [draftOrders, setDraftOrders] = useState<ParaclinicalOrderItem[]>(() =>
    initialOrders.map((o) => ({ ...o })),
  )
  const [expandedInstruction, setExpandedInstruction] = useState<Record<string, boolean>>({})
  const [saveCombo, setSaveCombo] = useState(false)
  const [comboName, setComboName] = useState('')
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const isDirty = useMemo(
    () => serializeOrders(draftOrders) !== serializeOrders(initialOrders) || (saveCombo && comboName.trim().length > 0),
    [draftOrders, initialOrders, saveCombo, comboName],
  )

  const requestClose = () => {
    if (isDirty) setConfirmDiscardOpen(true)
    else onClose()
  }

  useOverlayBehavior(true, requestClose)

  const activeProvider = providerById(providerId) ?? PARACLINICAL_PROVIDERS[0]
  const isDefaultProvider = defaultProviderId === providerId

  const filteredProviders = useMemo(() => {
    const q = normalizeText(providerQuery)
    if (!q) return PARACLINICAL_PROVIDERS
    return PARACLINICAL_PROVIDERS.filter((p) => normalizeText(`${p.name} ${p.address}`).includes(q))
  }, [providerQuery])

  // Dịch vụ và combo thuộc nơi thực hiện đang chọn + khớp từ khoá
  const { providerServices, providerCombos, imagingList, labList } = useMemo(() => {
    const q = normalizeText(serviceQuery)
    const services = PARACLINICAL_SERVICES.filter(
      (s) => s.providerId === providerId && (!q || normalizeText(`${s.name} ${s.groupLabel}`).includes(q)),
    )
    const combos = paraclinicalCombos.filter(
      (c) => c.providerId === providerId && (!q || normalizeText(c.name).includes(q)),
    )
    return {
      providerServices: services,
      providerCombos: combos,
      imagingList: services.filter((s) => s.category === 'imaging'),
      labList: services.filter((s) => s.category === 'lab'),
    }
  }, [providerId, serviceQuery, paraclinicalCombos])

  const visibleServices: ParaclinicalServiceItem[] =
    activeTab === 'all' ? providerServices : activeTab === 'imaging' ? imagingList : activeTab === 'lab' ? labList : []
  const visibleCombos: ParaclinicalCombo[] = activeTab === 'combo' ? providerCombos : []

  const selectedByServiceId = useMemo(
    () => new Set(draftOrders.map((o) => o.serviceId)),
    [draftOrders],
  )

  const toggleService = (service: ParaclinicalServiceItem) => {
    const exists = draftOrders.find((o) => o.serviceId === service.id)
    if (exists) {
      const reason = locked.get(exists.id)
      if (reason) {
        toast({ title: 'Không bỏ được chỉ định này', description: reason, tone: 'warning' })
        return
      }
      setDraftOrders((list) => list.filter((o) => o.serviceId !== service.id))
      return
    }
    const prov = providerById(service.providerId) ?? activeProvider
    const nextItem: ParaclinicalOrderItem = {
      id: `ord_${service.id}_${Date.now().toString(36)}`,
      serviceId: service.id,
      providerId: prov.id,
      providerName: prov.name,
      providerAddress: prov.address,
      name: service.name,
      groupLabel: service.groupLabel,
      category: service.category,
      unitPrice: service.price,
      quantity: 1,
      instruction: '',
    }
    setDraftOrders((list) => [...list, nextItem])
  }

  const applyCombo = (combo: ParaclinicalCombo) => {
    const prov = providerById(combo.providerId) ?? activeProvider
    setDraftOrders((prev) => {
      const next = [...prev]
      for (const ci of combo.items) {
        const svc = PARACLINICAL_SERVICES.find((s) => s.id === ci.serviceId)
        if (!svc) continue
        const existingIdx = next.findIndex((o) => o.serviceId === svc.id)
        if (existingIdx >= 0) {
          next[existingIdx] = { ...next[existingIdx], quantity: Math.max(next[existingIdx].quantity, ci.quantity) }
        } else {
          next.push({
            id: `ord_${svc.id}_${Math.random().toString(36).slice(2, 6)}`,
            serviceId: svc.id,
            providerId: prov.id,
            providerName: prov.name,
            providerAddress: prov.address,
            name: svc.name,
            groupLabel: svc.groupLabel,
            category: svc.category,
            unitPrice: svc.price,
            quantity: ci.quantity,
            instruction: ci.instruction ?? '',
          })
        }
      }
      return next
    })
    toast({ title: `Đã thêm ${combo.name}`, tone: 'info' })
  }

  const updateQuantity = (id: string, delta: number) => {
    setDraftOrders((list) =>
      list.map((o) => (o.id === id && !locked.has(id) ? { ...o, quantity: Math.max(1, o.quantity + delta) } : o)),
    )
  }

  const updateInstruction = (id: string, instruction: string) => {
    setDraftOrders((list) => list.map((o) => (o.id === id ? { ...o, instruction } : o)))
  }

  const removeOrder = (id: string) => {
    if (locked.has(id)) return
    setDraftOrders((list) => list.filter((o) => o.id !== id))
  }

  // Gom nhóm chỉ định theo Nơi thực hiện
  const groupedOrders = useMemo(() => {
    const map = new Map<
      string,
      { providerId: string; providerName: string; providerAddress: string; items: ParaclinicalOrderItem[]; subtotal: number }
    >()
    for (const item of draftOrders) {
      let group = map.get(item.providerId)
      if (!group) {
        group = {
          providerId: item.providerId,
          providerName: item.providerName,
          providerAddress: item.providerAddress,
          items: [],
          subtotal: 0,
        }
        map.set(item.providerId, group)
      }
      group.items.push(item)
      group.subtotal += item.unitPrice * item.quantity
    }
    return Array.from(map.values())
  }, [draftOrders])

  const estimatedTotal = useMemo(
    () => draftOrders.reduce((sum, o) => sum + o.unitPrice * o.quantity, 0),
    [draftOrders],
  )

  const handleConfirm = () => {
    if (draftOrders.length === 0 && initialOrders.length === 0) return
    if (saveCombo && draftOrders.length > 0) {
      const targetProvider = draftOrders[0].providerId
      const sameProviderItems = draftOrders
        .filter((o) => o.providerId === targetProvider)
        .map((o) => ({ serviceId: o.serviceId, quantity: o.quantity, instruction: o.instruction }))
      const finalComboName = comboName.trim() || `Combo thường dùng (${sameProviderItems.length} chỉ định)`
      saveParaclinicalCombo(finalComboName, targetProvider, sameProviderItems)
      toast({ title: `Đã lưu "${finalComboName}" vào mục Combo`, tone: 'success' })
    }
    onConfirm(draftOrders)
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: providerServices.length },
    { key: 'imaging', label: 'Chẩn đoán hình ảnh', count: imagingList.length },
    { key: 'lab', label: 'Xét nghiệm', count: labList.length },
    { key: 'combo', label: 'Combo', count: providerCombos.length },
  ]

  return (
    <>
      <Portal>
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-overlay/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thêm chỉ định cận lâm sàng"
            className="flex h-[84vh] max-h-[760px] w-full max-w-[1080px] animate-pop-in flex-col overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-line-soft px-5 py-3.5">
              <h2 className="text-[15.5px] font-semibold text-ink">Thêm chỉ định cận lâm sàng</h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Đóng"
                className="rounded-md p-1 text-ink-4 transition hover:bg-subtle hover:text-ink"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body 2 cột */}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              {/* CỘT TRÁI: Danh mục chỉ định */}
              <div className="flex min-h-0 flex-col border-line lg:border-r">
                {/* Chọn nơi thực hiện */}
                <div className="flex flex-wrap items-center gap-2.5 px-4 pt-3.5 pb-2.5">
                  <span className="text-[13px] font-medium text-ink-2">Nơi thực hiện</span>
                  <button
                    ref={providerTriggerRef}
                    type="button"
                    onClick={() => {
                      setProviderQuery('')
                      setProviderMenuOpen((o) => !o)
                    }}
                    className={cn(
                      'flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-[13px] transition hover:border-line-strong',
                      providerMenuOpen && 'border-brand ring-2 ring-brand/15',
                    )}
                  >
                    <span className="truncate">
                      <span className="font-semibold text-ink">{activeProvider.name}</span>{' '}
                      <span className="text-ink-4">({activeProvider.address})</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDefaultProvider(providerId)
                      toast({ title: `Đã đặt "${activeProvider.name}" làm nơi thực hiện mặc định`, tone: 'info' })
                    }}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition',
                      isDefaultProvider
                        ? 'border-line bg-canvas text-ink'
                        : 'border-line bg-surface text-ink-3 hover:bg-canvas',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        isDefaultProvider ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface',
                      )}
                    >
                      {isDefaultProvider && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    Mặc định
                  </button>

                  <Popover
                    open={providerMenuOpen}
                    onClose={() => setProviderMenuOpen(false)}
                    anchorRef={providerTriggerRef}
                    matchWidth
                    className="max-w-[460px] overflow-hidden p-1.5"
                  >
                    <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-2">
                      <Search className="h-3.5 w-3.5 text-ink-5" />
                      <input
                        autoFocus
                        value={providerQuery}
                        onChange={(e) => setProviderQuery(e.target.value)}
                        placeholder="Tìm theo tên lab, địa chỉ..."
                        aria-label="Tìm theo tên lab, địa chỉ"
                        className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
                      />
                    </div>
                    <div className="thin-scroll mt-1 max-h-64 space-y-1 overflow-y-auto">
                      {filteredProviders.map((prov) => {
                        const active = prov.id === providerId
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => {
                              setProviderId(prov.id)
                              setProviderMenuOpen(false)
                            }}
                            className={cn(
                              'block w-full rounded-lg px-3 py-2 text-left transition',
                              active
                                ? 'border border-brand bg-brand-tint/40'
                                : 'border border-transparent hover:bg-canvas',
                            )}
                          >
                            <p className="truncate text-[13px] font-semibold text-ink">{prov.name}</p>
                            <p className="truncate text-[12px] text-ink-4">{prov.address}</p>
                          </button>
                        )
                      })}
                      {filteredProviders.length === 0 && (
                        <p className="py-4 text-center text-xs text-ink-4">Không tìm thấy đơn vị phù hợp.</p>
                      )}
                    </div>
                  </Popover>
                </div>

                {/* Tìm kiếm dịch vụ */}
                <div className="border-y border-line-soft px-4 py-2">
                  <div className="-mx-2 flex items-center gap-2 rounded-md px-2 focus-within:ring-2 focus-within:ring-brand/25">
                    <Search className="h-4 w-4 text-ink-5" />
                    <input
                      value={serviceQuery}
                      onChange={(e) => setServiceQuery(e.target.value)}
                      placeholder="Tìm theo tên cận lâm sàng, combo..."
                      aria-label="Tìm theo tên cận lâm sàng, combo"
                      className="h-7 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
                    />
                    {serviceQuery && (
                      <button
                        type="button"
                        aria-label="Xoá từ khoá"
                        onClick={() => setServiceQuery('')}
                        className="grid h-6 w-6 place-items-center rounded-md text-ink-4 hover:bg-subtle hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs nhóm dịch vụ */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft bg-canvas/60 px-4 py-2">
                  {tabs.map((t) => {
                    const active = activeTab === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveTab(t.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] transition',
                          active
                            ? 'bg-surface font-semibold text-ink shadow-2xs ring-1 ring-line'
                            : 'font-medium text-ink-3 hover:text-ink',
                        )}
                      >
                        <span>{t.label}</span>
                        <span className="rounded-full bg-subtle px-1.5 text-[11px] font-semibold text-ink-4 tabular-nums">
                          {t.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Danh sách dịch vụ / combo */}
                <div className="thin-scroll flex-1 divide-y divide-line-soft overflow-y-auto">
                  {activeTab !== 'combo' &&
                    visibleServices.map((svc) => {
                      const selected = selectedByServiceId.has(svc.id)
                      return (
                        <div
                          key={svc.id}
                          onClick={() => toggleService(svc)}
                          className={cn(
                            'flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors',
                            selected ? 'bg-info-tint' : 'hover:bg-canvas',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                svc.category === 'imaging'
                                  ? 'bg-aux-soft text-aux-ink'
                                  : 'bg-accent-tint text-accent-ink',
                              )}
                            >
                              {svc.category === 'imaging' ? (
                                <ScanLine className="h-4 w-4" />
                              ) : (
                                <FlaskConical className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-semibold text-ink">{svc.name}</p>
                              <p className="truncate text-[11.5px] text-ink-4">{svc.groupLabel}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[13.5px] font-semibold text-brand-ink tabular-nums">
                              {formatMoney(svc.price)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleService(svc)
                              }}
                              aria-label={selected ? 'Bỏ chọn' : 'Thêm chỉ định'}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full transition',
                                selected
                                  ? 'bg-brand text-white shadow-xs'
                                  : 'bg-brand-tint text-brand-ink hover:bg-brand-soft',
                              )}
                            >
                              {selected ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Plus className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}

                  {activeTab === 'combo' &&
                    visibleCombos.map((combo) => {
                      const comboServices = combo.items
                        .map((i) => {
                          const s = PARACLINICAL_SERVICES.find((x) => x.id === i.serviceId)
                          return s ? { ...s, quantity: i.quantity } : null
                        })
                        .filter(Boolean) as (ParaclinicalServiceItem & { quantity: number })[]
                      const total = comboServices.reduce((sum, s) => sum + s.price * s.quantity, 0)
                      return (
                        <div
                          key={combo.id}
                          onClick={() => applyCombo(combo)}
                          className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition hover:bg-canvas"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warn-tint text-warn-strong">
                              <Layers className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-semibold text-ink">{combo.name}</p>
                              <p className="truncate text-[11.5px] text-ink-4">
                                {comboServices.map((s) => s.name).join(' · ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[13.5px] font-semibold text-brand-ink tabular-nums">
                              {formatMoney(total)}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
                              <Plus className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      )
                    })}

                  {((activeTab !== 'combo' && visibleServices.length === 0) ||
                    (activeTab === 'combo' && visibleCombos.length === 0)) && (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center">
                      <p className="text-[13px] text-ink-4">Không tìm thấy chỉ định phù hợp.</p>
                      {providerServices.length === 0 && !serviceQuery && providerId !== SAMPLE_PROVIDER_ID && (
                        <button
                          type="button"
                          onClick={() => setProviderId(SAMPLE_PROVIDER_ID)}
                          className="mt-1 rounded-lg border border-brand-line bg-brand-tint/70 px-3 py-1.5 text-[12px] font-medium text-brand-ink transition hover:bg-brand-soft/70"
                        >
                          Chuyển sang {providerById(SAMPLE_PROVIDER_ID)?.name} (có sẵn danh mục xét nghiệm & CĐHA)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: Danh sách chỉ định đang chọn */}
              <div className="flex min-h-0 flex-col bg-canvas/50">
                <div className="flex shrink-0 items-center justify-between px-4 pt-3.5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-ink">Số chỉ định đang chọn</h3>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-tint px-1.5 text-[11.5px] font-semibold text-brand-ink tabular-nums">
                      {draftOrders.length}
                    </span>
                  </div>
                  {draftOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftOrders((list) => list.filter((o) => locked.has(o.id)))}
                      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-danger-ink transition hover:text-danger-ink"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá tất cả
                    </button>
                  )}
                </div>

                {/* Danh sách đã chọn */}
                <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 pb-3">
                  {groupedOrders.length === 0 ? (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
                      <p className="mt-2 text-[13.5px] font-semibold text-ink">Chưa có chỉ định nào</p>
                      <p className="mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-ink-4">
                        Tích chọn chỉ định hoặc combo từ danh sách bên trái để thêm vào đây.
                      </p>
                    </div>
                  ) : (
                    groupedOrders.map((group) => (
                      <div key={group.providerId} className="rounded-xl border border-line/80 bg-surface p-3 shadow-2xs">
                        <div className="flex items-start justify-between gap-2 border-b border-line-soft pb-2.5">
                          <div className="min-w-0">
                            <p className="text-[13.5px] leading-snug font-semibold text-ink">
                              {group.providerName}
                            </p>
                            <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{group.providerAddress}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-3 tabular-nums">
                              {group.items.length}
                            </span>
                            <span className="text-[13px] font-semibold text-ink tabular-nums">
                              {formatMoney(group.subtotal)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 space-y-2.5">
                          {group.items.map((item) => {
                            const showInst = expandedInstruction[item.id] || item.instruction.length > 0
                            return (
                              <div key={item.id} className="rounded-lg border border-line-soft bg-canvas/40 p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <span
                                      className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                        item.category === 'imaging'
                                          ? 'bg-aux-soft text-aux-ink'
                                          : 'bg-accent-tint text-accent-ink',
                                      )}
                                    >
                                      {item.category === 'imaging' ? (
                                        <ScanLine className="h-3.5 w-3.5" />
                                      ) : (
                                        <FlaskConical className="h-3.5 w-3.5" />
                                      )}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                                      <p className="text-[12px] tabular-nums">
                                        <span className="font-semibold text-brand-ink">
                                          {formatMoney(item.unitPrice)}
                                        </span>{' '}
                                        <span className="text-ink-4">x{item.quantity}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <div className="inline-flex h-7 items-center rounded-md border border-line bg-surface">
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, -1)}
                                        disabled={item.quantity <= 1 || locked.has(item.id)}
                                        className="flex h-full w-6 items-center justify-center text-ink-4 hover:text-ink disabled:opacity-35"
                                        aria-label="Giảm số lượng"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="min-w-5 text-center text-[12.5px] font-semibold text-ink tabular-nums">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, 1)}
                                        disabled={locked.has(item.id)}
                                        className="flex h-full w-6 items-center justify-center text-ink-4 hover:text-ink disabled:opacity-35"
                                        aria-label="Tăng số lượng"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                    {locked.has(item.id) ? (
                                      <span className="rounded p-1 text-ink-5" title={locked.get(item.id)} aria-label={`Không xoá được: ${locked.get(item.id)}`}>
                                        <Lock className="h-3.5 w-3.5" />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => removeOrder(item.id)}
                                        className="rounded p-1 text-danger-ink transition hover:bg-danger-soft hover:text-danger-ink"
                                        aria-label="Xoá chỉ định"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {showInst ? (
                                  <input
                                    value={item.instruction}
                                    onChange={(e) => updateInstruction(item.id, e.target.value)}
                                    placeholder="Hướng dẫn người bệnh (VD: Nhịn ăn sáng 8 giờ trước lấy máu)..."
                                    className="mt-2 h-7 w-full rounded-md border border-line bg-surface px-2.5 text-[12px] text-ink outline-none placeholder:text-ink-4 focus:border-brand"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedInstruction((m) => ({ ...m, [item.id]: true }))}
                                    className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-md border border-line/70 bg-surface text-[12px] text-ink-4 transition hover:border-line-strong hover:text-ink-3"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Hướng dẫn người bệnh
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer tổng dự kiến + lưu combo + tạo chỉ định */}
                <div className="shrink-0 space-y-3 border-t border-line bg-surface p-4">
                  <div className="rounded-lg border border-warn-line bg-warn-tint/70 px-3 py-2">
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={saveCombo}
                        onChange={(e) => setSaveCombo(e.target.checked)}
                        disabled={draftOrders.length === 0}
                        className="h-4 w-4 rounded border-line-strong accent-warn"
                      />
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-warn text-white">
                        <Sparkles className="h-2.5 w-2.5" />
                      </span>
                      <span className="text-[12.5px] font-medium text-ink">Lưu thành combo thường dùng</span>
                    </label>
                    {saveCombo && (
                      <input
                        value={comboName}
                        onChange={(e) => setComboName(e.target.value)}
                        placeholder="Nhập tên combo (VD: Combo tầm soát sốt nhi)..."
                        className="mt-2 h-8 w-full rounded-md border border-warn-line bg-surface px-2.5 text-[12.5px] text-ink outline-none focus:border-warn"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] text-ink-4">Tổng dự kiến</p>
                      <p className="text-[17px] font-bold text-brand-ink tabular-nums">
                        {formatMoney(estimatedTotal)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={draftOrders.length === 0 && initialOrders.length === 0}
                      onClick={handleConfirm}
                      className={cn(
                        'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-[13.5px] font-semibold transition',
                        draftOrders.length > 0 || initialOrders.length > 0
                          ? 'bg-brand text-white shadow-sm hover:bg-brand-strong'
                          : 'cursor-not-allowed bg-subtle text-ink-5',
                      )}
                    >
                      <span>Tạo chỉ định</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Portal>

      <ConfirmDiscardModal
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onClose()
        }}
      />
    </>
  )
}
