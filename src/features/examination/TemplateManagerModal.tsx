import { useState } from 'react'
import { Check, ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { boxInput } from './ExamSections'
import type { PrescriptionTemplate } from '@/store/types'

const doseText = (i: PrescriptionTemplate['items'][number]) => {
  const parts = ([['Sáng', i.morning], ['Trưa', i.noon], ['Chiều', i.afternoon], ['Tối', i.evening]] as const).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`)
  return `${parts.join(', ') || 'Theo chỉ dẫn'} ${i.doseUnit} · ${i.days} ngày`
}

/**
 * Quản lý đơn mẫu (đổi tên, xoá, xem thuốc trong đơn) trong một hộp thoại nhỏ,
 * mở từ ô "Chọn đơn mẫu" ở màn khám: không rời phiếu khám, không làm mất đơn đang kê.
 */
export function TemplateManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const templates = useClinicState().prescriptionTemplates ?? []
  const { renamePrescriptionTemplate, deletePrescriptionTemplate } = useClinicActions()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string; error?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PrescriptionTemplate | null>(null)

  const list = templates.filter((t) => normalizeText(t.name).includes(normalizeText(q)))

  const saveName = () => {
    if (!editing) return
    const error = renamePrescriptionTemplate(editing.id, editing.name)
    if (error) return setEditing({ ...editing, error })
    setEditing(null)
    toast({ title: 'Đã đổi tên đơn mẫu', tone: 'success' })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title="Quản lý đơn mẫu"
        description={`${templates.length} đơn mẫu. Đổi tên, xoá hoặc xem thuốc trong từng đơn.`}
        bodyClassName="px-5 py-4"
        footer={
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm đơn mẫu" aria-label="Tìm đơn mẫu" className={cn(boxInput, 'h-9 pl-9')} />
        </div>

        {list.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-4">
            {templates.length === 0 ? 'Chưa có đơn mẫu. Lưu đơn đang kê ở “Thao tác khác” › “Lưu thành đơn mẫu”.' : 'Không có đơn mẫu khớp từ khoá.'}
          </p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-[12px] border border-line">
            {list.map((t) => {
              const isOpen = expanded === t.id
              const isEditing = editing?.id === t.id
              return (
                <li key={t.id} className="bg-surface">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {isEditing ? (
                      <div className="min-w-0 flex-1">
                        <input
                          autoFocus
                          value={editing.name}
                          onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName()
                            if (e.key === 'Escape') {
                              e.stopPropagation()
                              setEditing(null)
                            }
                          }}
                          aria-label="Tên đơn mẫu"
                          className={cn(boxInput, 'h-8', editing.error && 'border-danger')}
                        />
                        {editing.error && <p className="mt-1 text-[11.5px] font-medium text-danger-ink">{editing.error}</p>}
                      </div>
                    ) : (
                      <button type="button" onClick={() => setExpanded(isOpen ? null : t.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-4 transition-transform', !isOpen && '-rotate-90')} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{t.name}</span>
                          <span className="block truncate text-[12px] text-ink-4">
                            {t.items.length} thuốc{t.items.length ? ` · ${t.items.map((i) => i.name).join(', ')}` : ''}
                          </span>
                        </span>
                      </button>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5">
                      {isEditing ? (
                        <>
                          <Button size="icon-sm" variant="ghost" onClick={saveName} aria-label="Lưu tên">
                            <Check className="h-4 w-4 text-brand-ink" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Huỷ đổi tên">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ id: t.id, name: t.name })} aria-label={`Đổi tên ${t.name}`} title="Đổi tên">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => setConfirmDelete(t)} aria-label={`Xoá ${t.name}`} title="Xoá" className="hover:text-danger-ink">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isOpen && !isEditing && (
                    <div className="border-t border-line-soft bg-canvas px-4 py-2.5 text-[12.5px]">
                      {t.items.length === 0 ? (
                        <p className="text-ink-4">Đơn mẫu chưa có thuốc.</p>
                      ) : (
                        <ol className="list-decimal space-y-1 pl-4">
                          {t.items.map((i, k) => (
                            <li key={k} className="text-ink-2">
                              <b className="font-semibold text-ink">{i.name}</b> {i.strength && <span className="text-ink-4">{i.strength}</span>} · {doseText(i)} · SL {i.quantity} {i.quantityUnit}
                              {i.usage && <span className="block text-ink-4">{i.usage}</span>}
                            </li>
                          ))}
                        </ol>
                      )}
                      {t.advice && <p className="mt-2 text-ink-3">Lời dặn: {t.advice}</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      <ConfirmDiscardModal
        open={!!confirmDelete}
        title="Xoá đơn mẫu?"
        description={confirmDelete ? `Đơn mẫu “${confirmDelete.name}” sẽ bị xoá. Các đơn đã kê từ mẫu này không bị ảnh hưởng.` : ''}
        cancelLabel="Huỷ"
        confirmLabel="Xoá"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deletePrescriptionTemplate(confirmDelete.id)
            toast({ title: `Đã xoá đơn mẫu “${confirmDelete.name}”`, tone: 'info' })
          }
          setConfirmDelete(null)
        }}
      />
    </>
  )
}
