import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Portal } from './Portal'
import { cn } from '@/lib/cn'

/** Ngăn xếp lớp phủ: Esc chỉ đóng lớp trên cùng (vd. Modal thu tiền mở trên Drawer chi tiết) */
const overlayStack: symbol[] = []

export function hasOpenOverlay() {
  return overlayStack.length > 0
}

export function useOverlayBehavior(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const id = Symbol('overlay')
    overlayStack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayStack[overlayStack.length - 1] === id) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      overlayStack.splice(overlayStack.indexOf(id), 1)
      document.body.style.overflow = prev
    }
  }, [open])
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', '2xl': 'max-w-[1060px]' }

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: keyof typeof sizes
  footer?: ReactNode
  children: ReactNode
  bodyClassName?: string
}

export function Modal({ open, onClose, title, description, size = 'md', footer, children, bodyClassName }: ModalProps) {
  useOverlayBehavior(open, onClose)
  if (!open) return null
  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-[6vh]"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div role="dialog" aria-modal="true" className={cn('flex max-h-[88vh] w-full animate-pop-in flex-col rounded-xl bg-white shadow-2xl', sizes[size])}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={cn('flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  )
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  width?: string
  footer?: ReactNode
  children: ReactNode
  headerExtra?: ReactNode
}

export function Drawer({ open, onClose, title, width = 'w-[340px]', footer, children, headerExtra }: DrawerProps) {
  useOverlayBehavior(open, onClose)
  if (!open) return null
  return (
    <Portal>
      <div className="fixed inset-0 z-50 animate-fade-in bg-slate-900/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside role="dialog" aria-modal="true" className={cn('absolute top-0 right-0 flex h-full max-w-full animate-slide-in-right flex-col bg-white shadow-2xl', width)}>
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
              {headerExtra}
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-slate-100 px-4 py-3">{footer}</div>}
        </aside>
      </div>
    </Portal>
  )
}
