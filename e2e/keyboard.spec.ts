import { expect, test } from '@playwright/test'
import { trackErrors } from './helpers'

test.describe('Dùng bằng bàn phím', () => {
  test('mở menu bằng Enter, mũi tên xuống rồi Enter để vào màn', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')
    const group = page.getByRole('navigation', { name: 'Menu chính' }).getByRole('button', { name: /^Phòng khám/ })
    await group.focus()
    await page.keyboard.press('Enter')
    // Mở menu thì focus nằm ở mục đầu (Lễ tân), mũi tên xuống tới Khám bệnh
    await expect(page.getByRole('menuitem', { name: /^Lễ tân/ })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: /^Khám bệnh/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveTitle('Khám bệnh · ClinicHIS')
    // Chọn xong thì focus trở về nút nhóm
    await expect(group).toBeFocused()
    expect(errors).toEqual([])
  })

  test('Esc đóng menu và trả focus về nút mở', async ({ page }) => {
    await page.goto('/')
    const group = page.getByRole('navigation', { name: 'Menu chính' }).getByRole('button', { name: /^Hồ sơ/ })
    await group.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(group).toBeFocused()
  })

  test('mở chi tiết lượt khám từ bảng Lễ tân bằng nút Mã KB', async ({ page }) => {
    await page.goto('/')
    const codeBtn = page.locator('main tbody tr').first().getByRole('button', { name: /^Mở lượt khám YMD/ })
    const code = (await codeBtn.innerText()).trim()
    await codeBtn.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toContainText(code)
  })

  test('nút lọc trạng thái báo đang chọn (aria-pressed)', async ({ page }) => {
    await page.goto('/')
    const all = page.locator('main').getByRole('button', { name: /^Tất cả \(/ })
    const waiting = page.locator('main').getByRole('button', { name: /^Chờ khám \(/ })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    await waiting.click()
    await expect(waiting).toHaveAttribute('aria-pressed', 'true')
    await expect(all).toHaveAttribute('aria-pressed', 'false')
  })
})
