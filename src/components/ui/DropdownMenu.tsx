import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from 'react'
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

export function DropdownMenu({ renderTrigger, align = 'end', className, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      {renderTrigger({ ref, toggle: () => setOpen((o) => !o), open })}
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align={align} className={cn('min-w-44 py-1', className)}>
        <MenuContext.Provider value={{ close: () => setOpen(false) }}>
          <div role="menu">{children}</div>
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
}

export function MenuItem({ icon, children, onSelect, danger, disabled, shortcut, keepOpen }: MenuItemProps) {
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
        'flex w-full items-center gap-2.5 px-3 py-[7px] text-left text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-800 hover:bg-slate-100',
      )}
    >
      {icon && <span className={cn('flex h-4 w-4 items-center justify-center', danger ? 'text-red-600' : 'text-slate-500')}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-slate-500">{shortcut}</span>}
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
      className="flex w-full items-center gap-2.5 px-3 py-[6px] text-left text-[13px] text-slate-800 hover:bg-slate-100"
    >
      <span className="flex h-4 w-4 items-center justify-center">{checked && <Check className="h-4 w-4" />}</span>
      {children}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{children}</div>
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-100" />
}
