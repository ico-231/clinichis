export type ThemeMode = 'system' | 'light' | 'dark'

/** Áp dụng giao diện: thêm/bỏ class .dark trên <html>; trả về hàm huỷ theo dõi hệ thống */
export function applyTheme(mode: ThemeMode) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const set = () => document.documentElement.classList.toggle('dark', mode === 'dark' || (mode === 'system' && mq.matches))
  set()
  if (mode !== 'system') return () => {}
  mq.addEventListener('change', set)
  return () => mq.removeEventListener('change', set)
}
