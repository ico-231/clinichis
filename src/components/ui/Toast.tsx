import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
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
  const dismiss = (id: number) => setItems((list) => list.filter((t) => t.id !== id))
  const push = useCallback((t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-3), { ...t, tone: t.tone ?? 'success', id }])
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 4200)
  }, [])
  const icons = {
    success: <CircleCheck className="h-4.5 w-4.5 text-emerald-600" />,
    info: <Info className="h-4.5 w-4.5 text-blue-600" />,
    warning: <CircleAlert className="h-4.5 w-4.5 text-amber-600" />,
  }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <Portal>
        <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[340px] flex-col gap-2">
          {items.map((t) => (
            <div key={t.id} className={cn('pointer-events-auto flex animate-pop-in gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg')}>
              <span className="mt-px">{icons[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900">{t.title}</p>
                {t.description && <div className="mt-0.5 text-xs text-slate-600">{t.description}</div>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="h-fit rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Đóng">
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
