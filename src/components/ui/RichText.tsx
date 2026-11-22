import { useEffect, useRef } from 'react'
import { Bold, Italic, List, ListOrdered, Redo2, Underline, Undo2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN'])
/** Thẻ bỏ hẳn cả nội dung (không giữ lại phần chữ bên trong như các thẻ lạ khác) */
const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'TITLE', 'HEAD', 'META', 'LINK'])

/** Làm sạch HTML: chỉ giữ thẻ định dạng cơ bản, bỏ mọi thuộc tính (chống chèn script) */
export function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (DROP.has(child.tagName.toUpperCase())) {
        child.remove()
        continue
      }
      walk(child)
      if (!ALLOWED.has(child.tagName.toUpperCase())) {
        child.replaceWith(...child.childNodes)
      } else {
        for (const attr of [...child.attributes]) child.removeAttribute(attr.name)
      }
    }
  }
  const root = doc.body.firstElementChild as Element
  walk(root)
  return root.innerHTML
}

/** Chuyển HTML đã lưu thành văn bản thuần (dùng cho tóm tắt, tìm kiếm) */
export function htmlToText(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Hiển thị HTML đã làm sạch */
export function RichView({ html, className }: { html: string; className?: string }) {
  return <div className={cn('rich-content', className)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
}

const TOOLS = [
  { cmd: 'undo', icon: Undo2, label: 'Hoàn tác' },
  { cmd: 'redo', icon: Redo2, label: 'Làm lại' },
  { cmd: 'bold', icon: Bold, label: 'In đậm' },
  { cmd: 'italic', icon: Italic, label: 'In nghiêng' },
  { cmd: 'underline', icon: Underline, label: 'Gạch chân' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Danh sách đánh số' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Danh sách' },
] as const

/** Ô soạn thảo có định dạng cơ bản (đậm, nghiêng, gạch chân, danh sách) */
export function RichTextArea({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (html: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  // Chỉ đồng bộ từ ngoài vào khi nội dung khác (tránh nhảy con trỏ khi gõ)
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  const run = (cmd: string) => {
    ref.current?.focus()
    document.execCommand(cmd)
    onChange(sanitizeHtml(ref.current?.innerHTML ?? ''))
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <span className="mb-0.5 text-[13px] font-medium text-slate-800">{label}</span>
      <div className="flex min-h-0 flex-1 flex-col rounded-md border border-slate-200 focus-within:border-blue-500">
        <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1">
          {TOOLS.map((t, i) => (
            <button
              key={t.cmd}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(t.cmd)}
              className={cn('rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900', i === 2 && 'ml-2')}
            >
              <t.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div
          ref={ref}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={(e) => onChange(sanitizeHtml((e.target as HTMLDivElement).innerHTML))}
          className="rich-content rich-editor thin-scroll min-h-[90px] flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-6 outline-none"
        />
      </div>
    </div>
  )
}
