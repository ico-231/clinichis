import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Portal } from './Portal'
import { cn } from '@/lib/cn'

/** Ngăn xếp lớp phủ: Esc chỉ đóng lớp trên cùng (vd. Modal thu tiền mở trên Drawer chi tiết) */
const overlayStack: symbol[] = []

export function hasOpenOverlay() {
  return overlayStack.length > 0
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
const claimed = new WeakSet<Element>()

const focusables = (root: Element) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)

/**
 * Hành vi chung của lớp phủ (Modal, Drawer, hộp xác nhận…):
 * Esc đóng lớp trên cùng, khoá cuộn trang, đưa focus vào hộp thoại, giữ Tab bên trong
 * và trả focus về phần tử đã mở nó khi đóng (cho người dùng bàn phím / trình đọc màn hình).
 */
export function useOverlayBehavior(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const id = Symbol('overlay')
    overlayStack.push(id)
    const opener = document.activeElement as HTMLElement | null
    // Hộp thoại vừa render: phần tử aria-modal mới nhất chưa thuộc lớp phủ nào khác
    const container = [...document.querySelectorAll('[aria-modal="true"]')].reverse().find((el) => !claimed.has(el)) ?? null
    if (container) {
      claimed.add(container)
      if (!container.contains(document.activeElement)) {
        // Ưu tiên ô autofocus; hộp thoại có tabIndex=-1 thì focus chính nó để trình đọc màn hình đọc tiêu đề
        const target =
          container.querySelector<HTMLElement>('[autofocus]') ?? (container.getAttribute('tabindex') === '-1' ? (container as HTMLElement) : focusables(container)[0])
        ;(target ?? (container as HTMLElement)).focus({ preventScroll: true })
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (overlayStack[overlayStack.length - 1] !== id) return
      if (e.key === 'Escape') onCloseRef.current()
      else if (e.key === 'Tab' && container) {
        const list = focusables(container)
        if (!list.length) return
        const first = list[0]
        const last = list[list.length - 1]
        const active = document.activeElement
        if (!container.contains(active)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      overlayStack.splice(overlayStack.indexOf(id), 1)
      document.body.style.overflow = prev
      if (container) claimed.delete(container)
      // Trả focus về nơi mở hộp thoại nếu phần tử đó vẫn còn trên trang
      if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true })
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
  const titleId = useId()
  useOverlayBehavior(open, onClose)
  if (!open) return null
  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-overlay/35 p-4 pt-[6vh]"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn('flex max-h-[88vh] w-full animate-pop-in flex-col rounded-[18px] border border-line bg-surface shadow-pop outline-none', sizes[size])}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-bold text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-1 rounded-lg p-1 text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={cn('flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 rounded-b-[18px] border-t border-line bg-canvas px-5 py-3">{footer}</div>}
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
  const titleId = useId()
  useOverlayBehavior(open, onClose)
  if (!open) return null
  return (
    <Portal>
      <div className="fixed inset-0 z-50 animate-fade-in bg-overlay/35" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn('absolute top-0 right-0 flex h-full max-w-full animate-slide-in-right flex-col border-l border-line bg-surface shadow-pop outline-none', width)}>
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[17px] font-bold text-ink">{title}</h2>
              {headerExtra}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-line bg-canvas px-5 py-3">{footer}</div>}
        </aside>
      </div>
    </Portal>
  )
}
