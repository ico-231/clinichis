import { useId } from 'react'
import { Portal } from './Portal'
import { useOverlayBehavior } from './Modal'

interface ConfirmDiscardModalProps {
  open: boolean
  title?: string
  description?: string
  cancelLabel?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  /** Nút xác nhận màu đỏ cho thao tác không hoàn tác được */
  danger?: boolean
}

/** Hộp thoại xác nhận huỷ thay đổi (khớp ảnh chụp "Huỷ các thay đổi?") */
export function ConfirmDiscardModal({
  open,
  title = 'Huỷ các thay đổi?',
  description = 'Các thay đổi bạn vừa thực hiện sẽ không được lưu.',
  cancelLabel = 'Không',
  confirmLabel = 'Có',
  onCancel,
  onConfirm,
  danger,
}: ConfirmDiscardModalProps) {
  const titleId = useId()
  const descId = useId()
  useOverlayBehavior(open, onCancel)
  if (!open) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[75] flex animate-fade-in items-center justify-center bg-slate-900/50 p-4"
        onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
      >
        <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="w-full max-w-[380px] animate-pop-in rounded-2xl bg-white p-5 shadow-2xl">
          <h3 id={titleId} className="text-[15.5px] font-semibold text-slate-900">{title}</h3>
          <p id={descId} className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{description}</p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-5 text-[13px] font-semibold text-white shadow-xs transition ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
