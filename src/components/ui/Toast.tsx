import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { Portal } from './Portal'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'info' | 'warning'
interface ToastItem {
  id: number
  title: string
  description?: ReactNode
  tone: ToastTone
}

const ToastContext = createContext<(t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<number, number>())
  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])
  /** Hẹn giờ tự đóng; cảnh báo hiện lâu hơn để kịp đọc (vd. "Bộ nhớ đầy", "Cảnh báo dị ứng") */
  const schedule = useCallback(
    (id: number, ms: number) => {
      window.clearTimeout(timers.current.get(id))
      timers.current.set(id, window.setTimeout(() => dismiss(id), ms))
    },
    [dismiss],
  )
  const push = useCallback(
    (t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) => {
      const id = Date.now() + Math.random()
      const tone = t.tone ?? 'success'
      setItems((list) => [...list.slice(-3), { ...t, tone, id }])
      schedule(id, tone === 'warning' ? 10_000 : 5_000)
    },
    [schedule],
  )
  const icons = {
    success: <CircleCheck className="h-4.5 w-4.5 text-brand-ink" />,
    info: <Info className="h-4.5 w-4.5 text-info-ink" />,
    warning: <CircleAlert className="h-4.5 w-4.5 text-warn-ink" />,
  }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <Portal>
        <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              // Rê chuột vào thì dừng đếm giờ, rời ra thì đóng sau ít giây
              onMouseEnter={() => window.clearTimeout(timers.current.get(t.id))}
              onMouseLeave={() => schedule(t.id, 3_000)}
              className={cn('pointer-events-auto flex animate-pop-in gap-3 rounded-xl border border-line bg-surface p-3 shadow-pop', t.tone === 'warning' && 'border-warn-line')}
            >
              <span className="mt-px">{icons[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.description && <div className="mt-0.5 text-xs text-ink-3">{t.description}</div>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="-mt-1 -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Đóng">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
