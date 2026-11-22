import { useId, useLayoutEffect, useRef } from 'react'

/** Ô nhập đầu tiên nằm cạnh nhãn (cùng khối cha) */
const CONTROL = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea'

/**
 * Gắn nhãn hiển thị (span/label nằm trên ô) với ô nhập đi kèm cho trình đọc màn hình:
 * ô nhập đầu tiên trong cùng khối cha nhận `aria-labelledby` (nếu chưa tự có nhãn),
 * khi có lỗi thì thêm `aria-invalid` + `aria-describedby` trỏ tới dòng lỗi.
 *
 * Dùng cho các khung trường kiểu "nhãn + children" — không cần sửa từng ô nhập bên trong.
 */
export function useControlLabel<T extends HTMLElement = HTMLElement>(error?: string) {
  const labelId = useId()
  const errorId = `${labelId}-err`
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const scope = ref.current?.parentElement
    const ctl = scope?.querySelector<HTMLElement>(CONTROL)
    if (!ctl) return
    const managed = ctl.dataset.autoLabel === labelId
    if (!managed && (ctl.hasAttribute('aria-label') || ctl.hasAttribute('aria-labelledby'))) return
    ctl.dataset.autoLabel = labelId
    ctl.setAttribute('aria-labelledby', labelId)
    if (error) {
      ctl.setAttribute('aria-invalid', 'true')
      ctl.setAttribute('aria-describedby', errorId)
    } else {
      ctl.removeAttribute('aria-invalid')
      ctl.removeAttribute('aria-describedby')
    }
  })
  return { ref, labelId, errorId }
}
