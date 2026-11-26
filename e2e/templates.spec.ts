import { expect, test } from '@playwright/test'
import { openScreen, trackErrors } from './helpers'

test('quản lý đơn mẫu từ màn khám: đổi tên rồi xoá', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await openScreen(page, 'Phòng khám', 'Khám bệnh')
  await page.locator('main').getByRole('button', { name: /^Chờ khám \(/ }).click()
  await page.locator('main tbody tr').first().click()

  await page.locator('main').getByRole('button', { name: 'Chọn đơn mẫu' }).click()
  await page.getByRole('button', { name: 'Quản lý đơn mẫu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Quản lý đơn mẫu' })
  await expect(dialog).toBeVisible()

  // Đổi tên đơn mẫu đầu tiên
  const firstRename = dialog.getByRole('button', { name: /^Đổi tên / }).first()
  const oldName = ((await firstRename.getAttribute('aria-label')) ?? '').replace(/^Đổi tên /, '')
  await firstRename.click()
  const input = dialog.getByRole('textbox', { name: 'Tên đơn mẫu' })
  await input.fill('')
  await input.press('Enter')
  await expect(dialog.getByText('Tên đơn mẫu không được để trống')).toBeVisible()
  await input.fill('Mẫu E2E đổi tên')
  await input.press('Enter')
  await expect(dialog.getByText('Mẫu E2E đổi tên')).toBeVisible()
  await expect(dialog.getByRole('button', { name: `Đổi tên ${oldName}`, exact: true })).toHaveCount(0)

  // Xoá: có hỏi lại, xác nhận thì mất khỏi danh sách
  await dialog.getByRole('button', { name: 'Xoá Mẫu E2E đổi tên' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Xoá đơn mẫu?' })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Xoá', exact: true }).click()
  await expect(dialog.getByText('Mẫu E2E đổi tên')).toHaveCount(0)
  expect(errors).toEqual([])
})
