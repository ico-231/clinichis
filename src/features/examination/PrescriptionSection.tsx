import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, BookmarkPlus, ChevronDown, Eraser, FileText, Pill, Plus, Printer, Search, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { DocumentsEmptyIllustration } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Popover } from '@/components/ui/Popover'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { DOSE_UNITS, DRUGS } from '@/store/drugCatalog'
import { normalizeText } from '@/lib/format'
import { formatDateTimeVN } from '@/lib/date'
import { cn } from '@/lib/cn'
import { Section, boxInput, type DraftUpdate } from './ExamSections'
import { computeQuantity, type ExamDraft } from './examDraft'
import type { Drug, PrescriptionItem, PrescriptionTemplate } from '@/store/types'

interface Props {
  draft: ExamDraft
  update: DraftUpdate
  sentAt?: string
  onPrint: () => void
  onSend: () => void
}

const newId = () => `rx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function itemFromDrug(d: Drug): PrescriptionItem {
  return {
    id: newId(),
    drugId: d.id,
    name: d.name,
    activeIngredient: d.activeIngredient,
    strength: d.strength,
    days: 3,
    doseUnit: d.unit,
    morning: 1,
    noon: 0,
    afternoon: 1,
    evening: 0,
    quantity: 6,
    quantityUnit: d.unit,
    usage: d.route === 'Uống' ? 'Uống sau ăn' : d.route,
  }
}

/** Kê đơn thuốc (chỉ kê – không bán thuốc). Số lượng tự tính theo số ngày × liều. */
export function PrescriptionSection({ draft, update, sentAt, onPrint, onSend }: Props) {
  const toast = useToast()
  const items = draft.prescription
  const searchRef = useRef<HTMLInputElement>(null)
  const [saveTplOpen, setSaveTplOpen] = useState(false)

  const setItems = (next: PrescriptionItem[]) => update({ prescription: next })
  const patchItem = (id: string, patch: Partial<PrescriptionItem>) =>
    setItems(
      items.map((it) => {
        if (it.id !== id) return it
        const merged = { ...it, ...patch }
        // tự tính lại số lượng khi đổi số ngày / liều (trừ khi sửa trực tiếp số lượng)
        if (!('quantity' in patch)) merged.quantity = computeQuantity(merged)
        return merged
      }),
    )

  const addDrug = (d: Drug) => {
    if (items.some((it) => it.drugId === d.id)) {
      toast({ title: `${d.name} đã có trong đơn`, tone: 'warning' })
      return
    }
    setItems([...items, itemFromDrug(d)])
  }

  const applyTemplate = (tpl: PrescriptionTemplate) => {
    const existing = new Set(items.map((it) => it.drugId))
    const added = tpl.items.filter((it) => !existing.has(it.drugId)).map((it) => ({ ...it, id: newId() }))
    update({ prescription: [...items, ...added], advice: draft.advice || tpl.advice })
    toast({ title: `Đã áp dụng đơn mẫu "${tpl.name}"`, description: `${added.length} thuốc được thêm vào đơn`, tone: 'success' })
  }

  return (
    <Section
      id="sec-prescription"
      title="Đơn thuốc"
      right={
        <>
          {sentAt && <span className="text-xs text-emerald-700">Đã gửi {formatDateTimeVN(sentAt)}</span>}
          <DropdownMenu
            align="end"
            renderTrigger={({ ref, toggle }) => (
              <Button ref={ref} size="sm" variant="outline" onClick={toggle} rightIcon={<ChevronDown className="h-3.5 w-3.5" />}>
                Thao tác khác
              </Button>
            )}
          >
            <MenuItem icon={<BookmarkPlus className="h-3.5 w-3.5" />} disabled={!items.length} onSelect={() => setSaveTplOpen(true)}>
              Lưu thành đơn mẫu
            </MenuItem>
            <MenuItem icon={<Eraser className="h-3.5 w-3.5" />} danger disabled={!items.length} onSelect={() => setItems([])}>
              Xoá toàn bộ thuốc
            </MenuItem>
          </DropdownMenu>
          <Button size="sm" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={onPrint} disabled={!items.length}>
            In đơn thuốc
          </Button>
          <Button size="sm" variant="soft" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={onSend} disabled={!items.length}>
            Gửi đơn thuốc
          </Button>
        </>
      }
    >
      {draft.allergy && (
        <p role="note" className="mb-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12.5px] text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b>Lưu ý dị ứng:</b> {draft.allergyNote || 'người bệnh có tiền sử dị ứng'}
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <TemplatePicker onPick={applyTemplate} />
        <DrugSearch inputRef={searchRef} onPick={addDrug} />
      </div>

      {items.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <DocumentsEmptyIllustration />
          <p className="text-[13px] text-slate-600">Chưa có thuốc trong đơn. Thêm thuốc hoặc chọn đơn mẫu để kê đơn.</p>
          <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => searchRef.current?.focus()}>
            Thêm thuốc
          </Button>
        </div>
      ) : (
        <div className="thin-scroll mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="bg-slate-50 text-[12.5px] text-slate-600">
              <tr>
                <th className="w-8" />
                <th className="px-2 py-2 text-left font-medium">Tên thuốc</th>
                <th className="w-[72px] px-2 py-2 font-medium">Số ngày</th>
                <th className="w-[100px] px-2 py-2 font-medium">Liều dùng</th>
                {['Sáng', 'Trưa', 'Chiều', 'Tối'].map((h) => (
                  <th key={h} className="w-[58px] px-1 py-2 font-medium">
                    {h}
                  </th>
                ))}
                <th className="w-[130px] px-2 py-2 font-medium">Số lượng</th>
                <th className="w-[200px] px-2 py-2 text-left font-medium">Cách dùng thuốc</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100 align-top">
                  <td className="px-1 pt-2.5 text-center">
                    <button type="button" onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-red-600 hover:text-red-700" aria-label={`Xoá ${it.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-semibold text-slate-900">{it.name}</p>
                    <p className="text-xs text-slate-500">{it.activeIngredient}</p>
                  </td>
                  <td className="px-2 py-1.5">
                    <NumberCell label={`Số ngày dùng ${it.name}`} value={it.days} min={1} onChange={(days) => patchItem(it.id, { days: Math.max(1, Math.round(days)) })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <UnitSelect label={`Đơn vị liều ${it.name}`} value={it.doseUnit} onChange={(doseUnit) => patchItem(it.id, { doseUnit, quantityUnit: doseUnit })} />
                  </td>
                  {(['morning', 'noon', 'afternoon', 'evening'] as const).map((k, i) => (
                    <td key={k} className="px-1 py-1.5">
                      <NumberCell label={`Liều ${['sáng', 'trưa', 'chiều', 'tối'][i]} ${it.name}`} value={it[k]} step={0.5} onChange={(n) => patchItem(it.id, { [k]: Math.max(0, n) })} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <NumberCell label={`Số lượng ${it.name}`} value={it.quantity} onChange={(quantity) => patchItem(it.id, { quantity: Math.max(0, Math.round(quantity)) })} />
                      <span className="shrink-0 text-xs text-slate-500">{it.quantityUnit}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <textarea
                      value={it.usage}
                      rows={1}
                      onChange={(e) => patchItem(it.id, { usage: e.target.value })}
                      placeholder="Nhập cách dùng..."
                      aria-label={`Cách dùng ${it.name}`}
                      className={cn(boxInput, 'resize-y py-1.5')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <textarea
        value={draft.advice}
        rows={2}
        onChange={(e) => update({ advice: e.target.value })}
        placeholder="Lời dặn của bác sĩ..."
        aria-label="Lời dặn của bác sĩ"
        className={cn(boxInput, 'mt-2 resize-y py-2')}
      />

      {saveTplOpen && <SaveTemplateModal draft={draft} onClose={() => setSaveTplOpen(false)} />}
    </Section>
  )
}

function NumberCell({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <input
      aria-label={label}
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(Number(e.target.value.replace(',', '.')) || 0)}
      onFocus={(e) => e.target.select()}
      className="h-8 w-full border-b border-slate-300 bg-transparent text-center tabular-nums outline-none focus:border-blue-600"
    />
  )
}

function UnitSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const options = DOSE_UNITS.includes(value) ? DOSE_UNITS : [value, ...DOSE_UNITS]
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-full border-b border-slate-300 bg-transparent outline-none focus:border-blue-600">
      {options.map((u) => (
        <option key={u}>{u}</option>
      ))}
    </select>
  )
}

function DrugSearch({ onPick, inputRef }: { onPick: (d: Drug) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const anchorRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => {
    const n = normalizeText(q)
    return (n ? DRUGS.filter((d) => normalizeText(`${d.name} ${d.activeIngredient} ${d.id}`).includes(n)) : DRUGS).slice(0, 30)
  }, [q])
  const pick = (d: Drug) => {
    onPick(d)
    setQ('')
    setOpen(false)
  }
  return (
    <div ref={anchorRef} className="relative min-w-[260px] flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            pick(results[active])
          }
        }}
        placeholder="Tìm theo tên thuốc, hoạt chất"
        aria-label="Tìm theo tên thuốc, hoạt chất"
        className={cn(boxInput, 'h-9 pl-8')}
      />
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} matchWidth className="py-1">
        <ul className="max-h-80 overflow-auto" role="listbox">
          {results.length === 0 && <li className="px-3 py-3 text-[13px] text-slate-500">Không tìm thấy thuốc phù hợp.</li>}
          {results.map((d, i) => (
            <li key={d.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(d)}
                className={cn('flex w-full items-start gap-2.5 px-3 py-2 text-left', i === active && 'bg-slate-100')}
              >
                <Pill className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span className="min-w-0 text-[12.5px] leading-5">
                  <b className="text-[13px] text-slate-900">{d.name}</b>
                  <span className="block text-slate-600">Hoạt chất: {d.activeIngredient}</span>
                  <span className="block text-slate-500">
                    Hàm lượng: {d.strength}. Dạng bào chế: {d.form}. Đường dùng: {d.route}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  )
}

function TemplatePicker({ onPick }: { onPick: (t: PrescriptionTemplate) => void }) {
  const templates = useClinicState().prescriptionTemplates ?? []
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLButtonElement>(null)
  const list = templates.filter((t) => normalizeText(t.name).includes(normalizeText(q)))
  return (
    <>
      <Button ref={ref} variant="outline" leftIcon={<FileText className="h-3.5 w-3.5" />} rightIcon={<ChevronDown className="h-3.5 w-3.5" />} onClick={() => setOpen((o) => !o)}>
        Chọn đơn mẫu
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} className="w-[340px] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên đơn mẫu..." aria-label="Tìm theo tên đơn mẫu" className={cn(boxInput, 'h-8 pl-8')} />
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-5 text-center">
            <DocumentsEmptyIllustration className="h-[56px] w-[70px]" />
            <p className="text-[13px] font-medium text-slate-700">Hiện không có đơn mẫu nào</p>
            <p className="text-xs text-slate-500">Lưu đơn đang kê ở “Thao tác khác” để tạo mới.</p>
          </div>
        ) : (
          <ul className="mt-1 max-h-64 overflow-auto">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(t)
                    setOpen(false)
                  }}
                  className="w-full rounded-md px-2.5 py-2 text-left hover:bg-slate-100"
                >
                  <span className="block text-[13px] font-medium text-slate-900">{t.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {t.items.length} thuốc · {t.items.map((i) => i.name).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </>
  )
}

function SaveTemplateModal({ draft, onClose }: { draft: ExamDraft; onClose: () => void }) {
  const { savePrescriptionTemplate } = useClinicActions()
  const toast = useToast()
  const [name, setName] = useState(() => draft.diagnoses[0]?.name ?? '')
  const save = () => {
    if (!name.trim()) return
    savePrescriptionTemplate({
      name: name.trim(),
      advice: draft.advice.trim(),
      items: draft.prescription.map(({ id: _id, ...rest }) => rest),
    })
    toast({ title: `Đã lưu đơn mẫu "${name.trim()}"`, tone: 'success' })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Lưu thành đơn mẫu"
      description={`${draft.prescription.length} thuốc và lời dặn hiện tại sẽ được lưu.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Lưu đơn mẫu
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-slate-800">Tên đơn mẫu</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className={cn(boxInput, 'h-9')} />
      </label>
    </Modal>
  )
}
