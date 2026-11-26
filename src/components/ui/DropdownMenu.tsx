import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Check } from 'lucide-react'
import { Popover } from './Popover'
import { cn } from '@/lib/cn'

const MenuContext = createContext<{ close: () => void }>({ close: () => {} })

interface DropdownMenuProps {
  renderTrigger: (props: { ref: RefObject<HTMLButtonElement | null>; toggle: () => void; open: boolean }) => ReactNode
  align?: 'start' | 'end'
  className?: string
  children: ReactNode
}

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)'

/**
 * Menu thả xuống theo mẫu menu của ARIA: mở thì focus mục đầu, mũi tên lên/xuống/Home/End để di chuyển,
 * Esc / chọn mục thì đóng và trả focus về nút mở, Tab thì đóng. (Điều hướng trong menu, không phải phím tắt.)
 */
export function DropdownMenu({ renderTrigger, align = 'end', className, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Mở: focus mục đầu (Popover cần một nhịp để định vị nên thử lại vài khung hình)
  useEffect(() => {
    if (!open) return
    let tries = 0
    let raf = 0
    const focusFirst = () => {
      const first = menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)
      if (first && menuRef.current?.offsetParent !== null) first.focus({ preventScroll: true })
      else if (tries++ < 10) raf = requestAnimationFrame(focusFirst)
    }
    raf = requestAnimationFrame(focusFirst)
    return () => cancelAnimationFrame(raf)
  }, [open])

  /** Đóng menu; nếu focus đang ở trong menu thì trả về nút mở (click ra ngoài thì không giành focus) */
  const close = () => {
    const focusInside = !!menuRef.current?.contains(document.activeElement)
    setOpen(false)
    if (focusInside) ref.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])]
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    const move = (to: number) => {
      e.preventDefault()
      items[(to + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') move(i + 1)
    else if (e.key === 'ArrowUp') move(i < 0 ? items.length - 1 : i - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(items.length - 1)
    else if (e.key === 'Tab') {
      e.preventDefault()
      close()
    }
  }

  return (
    <>
      {renderTrigger({ ref, toggle: () => setOpen((o) => !o), open })}
      <Popover open={open} onClose={close} anchorRef={ref} align={align} className={cn('min-w-44 py-1', className)}>
        <MenuContext.Provider value={{ close }}>
          <div role="menu" ref={menuRef} onKeyDown={onKeyDown}>
            {children}
          </div>
        </MenuContext.Provider>
      </Popover>
    </>
  )
}

interface MenuItemProps {
  icon?: ReactNode
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
  disabled?: boolean
  shortcut?: ReactNode
  /** Giữ menu mở sau khi chọn */
  keepOpen?: boolean
  className?: string
}

export function MenuItem({ icon, children, onSelect, danger, disabled, shortcut, keepOpen, className }: MenuItemProps) {
  const { close } = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onSelect?.()
        if (!keepOpen) close()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-[7px] text-left text-[13px] transition-colors outline-none focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-40',
        danger ? 'text-danger-ink hover:bg-danger-soft' : 'text-ink hover:bg-subtle',
        className,
      )}
    >
      {icon && <span className={cn('flex h-4 w-4 items-center justify-center', danger ? 'text-danger-ink' : 'text-ink-3')}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-ink-3">{shortcut}</span>}
    </button>
  )
}

export function MenuCheckItem({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-[6px] text-left text-[13px] text-ink outline-none hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="flex h-4 w-4 items-center justify-center">{checked && <Check className="h-4 w-4 text-brand-ink" />}</span>
      {children}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{children}</div>
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />
}
