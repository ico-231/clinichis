/**
 * true khi phím đang được gõ vào một ô nhập (input/textarea/select/contenteditable).
 * Dùng để chặn phím tắt dạng chữ cái (Shift+C, Shift+T...) khi người dùng đang nhập liệu,
 * vì Shift + chữ cái cũng chính là cách gõ chữ hoa.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  // Các input không nhận ký tự gõ (checkbox, radio, nút...) vẫn cho phép phím tắt
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type)
}
