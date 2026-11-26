import { expect, type Page } from '@playwright/test'

/** Mở một màn qua menu ngang: bấm nhóm, nếu nhóm có menu con thì bấm mục con */
export async function openScreen(page: Page, group: string, item = group) {
  const nav = page.getByRole('navigation', { name: 'Menu chính' })
  await nav.getByRole('button', { name: new RegExp(`^${group}`) }).click()
  if (item !== group) {
    // Mục con trong menu thả xuống (role menuitem), tên bắt đầu bằng nhãn
    await page.getByRole('menuitem', { name: new RegExp(`^${item}`) }).first().click()
  }
}

/** Ghi lại lỗi console / lỗi JS chưa bắt trong suốt test */
export function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Màn không rơi vào khung "Màn hình này gặp lỗi" của ErrorBoundary */
export async function expectNoCrash(page: Page) {
  await expect(page.getByText('Màn hình này gặp lỗi')).toHaveCount(0)
}

/** Số trong nút lọc dạng "Chờ khám (4)" */
export async function chipCount(page: Page, label: string) {
  const text = await page
    .locator('main')
    .getByRole('button', { name: new RegExp(`^${label} \\(\\d+\\)$`) })
    .innerText()
  return Number(text.match(/\((\d+)\)/)?.[1] ?? NaN)
}
