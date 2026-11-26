import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Portal } from './Portal'
import { cn } from '@/lib/cn'

interface PopoverProps {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  align?: 'start' | 'end'
  /** Đặt min-width bằng chiều rộng phần tử neo */
  matchWidth?: boolean
  offset?: number
  className?: string
  children: ReactNode
}

/**
 * Lớp nổi định vị cố định theo phần tử neo (không bị cắt bởi overflow của bảng/modal).
 * Tự lật lên trên khi thiếu chỗ, đóng khi click ra ngoài hoặc nhấn Esc.
 */
export function Popover({ open, onClose, anchorRef, align = 'start', matchWidth, offset = 4, className, children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const panel = panelRef.current
      const ph = panel?.offsetHeight ?? 0
      const pw = Math.max(panel?.offsetWidth ?? 0, matchWidth ? r.width : 0)
      let top = r.bottom + offset
      if (top + ph > window.innerHeight - 8 && r.top - offset - ph > 8) top = r.top - offset - ph
      let left = align === 'end' ? r.right - pw : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - pw - 8))
      setPos({ top, left, width: r.width })
    }
    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, align, offset, matchWidth, anchorRef])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onCloseRef.current()
    }
    // capture để Esc chỉ đóng popover, không đóng luôn Modal/Drawer phía dưới
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, anchorRef])

  if (!open) return null
  return (
    <Portal>
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          minWidth: matchWidth ? pos?.width : undefined,
          visibility: pos ? 'visible' : 'hidden',
        }}
        className={cn('z-[80] animate-pop-in rounded-[12px] border border-line bg-surface shadow-pop', className)}
      >
        {children}
      </div>
    </Portal>
  )
}
