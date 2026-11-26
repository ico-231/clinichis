import { expect, test } from '@playwright/test'
import { expectNoCrash, openScreen, trackErrors } from './helpers'

/** 13 mục menu: [nhóm, mục, tiêu đề tab mong đợi] */
const SCREENS: [string, string, string][] = [
  ['Tổng quan', 'Tổng quan', 'Tổng quan'],
  ['Phòng khám', 'Lễ tân', 'Lễ tân'],
  ['Phòng khám', 'Khám bệnh', 'Khám bệnh'],
  ['Lịch', 'Lịch hẹn', 'Lịch hẹn'],
  ['Lịch', 'Lịch làm việc', 'Lịch làm việc'],
  ['Hồ sơ', 'Bệnh án điện tử', 'Bệnh án điện tử'],
  ['Hồ sơ', 'Người bệnh', 'Người bệnh'],
  ['Cận lâm sàng', 'Chẩn đoán hình ảnh', 'Chẩn đoán hình ảnh'],
  ['Cận lâm sàng', 'Xét nghiệm', 'Xét nghiệm'],
  ['Cận lâm sàng', 'Báo cáo CLS', 'Báo cáo CLS'],
  ['Cận lâm sàng', 'Thiết lập', 'Thiết lập CLS'],
  ['Quản lý', 'Báo cáo', 'Báo cáo'],
  ['Quản lý', 'Hệ thống', 'Hệ thống'],
]

test('mở lần lượt 13 màn trong menu, không màn nào lỗi', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Lễ tân' })).toBeVisible()

  for (const [group, item, title] of SCREENS) {
    await test.step(`${group} › ${item}`, async () => {
      await openScreen(page, group, item)
      await expect(page).toHaveTitle(`${title} · ClinicHIS`)
      await expect(page.getByText('Đang tải màn hình...')).toHaveCount(0)
      await expectNoCrash(page)
    })
  }
  expect(errors).toEqual([])
})

test('menu không còn mục Kê đơn', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Menu chính' }).getByRole('button', { name: /^Phòng khám/ }).click()
  await expect(page.getByRole('menuitem', { name: /^Khám bệnh/ })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /^Kê đơn/ })).toHaveCount(0)
})

test('màn hẹp (dưới 1024px) dùng menu dạng ngăn kéo', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 })
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Menu chính' })).toHaveCount(0)
  await page.getByRole('button', { name: /menu/i }).first().click()
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: /^Người bệnh/ }).click()
  await expect(page).toHaveTitle('Người bệnh · ClinicHIS')
  await expect(drawer).toHaveCount(0)
  expect(errors).toEqual([])
})
