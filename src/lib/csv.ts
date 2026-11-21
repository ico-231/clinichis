/** Tạo CSV (UTF-8 có BOM để Excel hiển thị đúng tiếng Việt) */
export function toCsv(header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}

export function downloadText(content: string, filename: string, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
