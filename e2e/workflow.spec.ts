import { expect, test, type Page } from '@playwright/test'
import { chipCount, openScreen, trackErrors } from './helpers'

/** Tiếp nhận một người bệnh mới, trả về họ tên đã in hoa như app lưu */
async function registerNewPatient(page: Page, name: string, phone: string) {
  await page.getByRole('button', { name: 'Thêm bệnh mới' }).click()
  const main = page.locator('main')
  await main.getByRole('textbox', { name: 'Họ và tên*' }).fill(name)
  await main.getByRole('textbox', { name: 'Điện thoại*' }).fill(phone)
  await main.getByRole('textbox', { name: 'Ngày sinh*' }).fill('01/02/2020')
  await main.getByRole('button', { name: 'Chọn tỉnh/thành phố' }).click()
  await page.getByRole('button', { name: 'TP. Hồ Chí Minh' }).click()
  await main.getByRole('button', { name: 'Đăng ký khám' }).click()
  return name.toLocaleUpperCase('vi-VN')
}

test.describe('Lễ tân', () => {
  test('tiếp nhận người bệnh mới → có trong danh sách, còn nguyên sau khi tải lại trang', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')
    const before = await chipCount(page, 'Đã đăng ký khám')

    const upper = await registerNewPatient(page, 'Trần Thử Nghiệm', '0912345678')
    await expect(page.getByRole('status').filter({ hasText: `Đã đăng ký khám: ${upper}` })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Lễ tân' })).toBeVisible()
    await expect(page.locator('main tbody tr', { hasText: upper })).toContainText('Đã đăng ký')
    expect(await chipCount(page, 'Đã đăng ký khám')).toBe(before + 1)

    // Dữ liệu lưu trong localStorage: tải lại vẫn còn
    await page.reload()
    await expect(page.locator('main tbody tr', { hasText: upper })).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test('bỏ trống trường bắt buộc thì không đăng ký được', async ({ page }) => {
    await page.goto('/')
    const before = await chipCount(page, 'Tất cả')
    await page.getByRole('button', { name: 'Thêm bệnh mới' }).click()
    await page.locator('main').getByRole('button', { name: 'Đăng ký khám' }).click()
    // Vẫn ở form tiếp nhận
    await expect(page.locator('main').getByText('Tiếp nhận người bệnh mới')).toBeVisible()
    await page.locator('main').getByRole('button', { name: 'Danh sách lễ tân' }).click()
    expect(await chipCount(page, 'Tất cả')).toBe(before)
  })
})

test.describe('Khám bệnh', () => {
  test('khám người bệnh đang chờ: sinh hiệu, chẩn đoán ICD, kê thuốc, hoàn thành', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')
    await openScreen(page, 'Phòng khám', 'Khám bệnh')
    await expect(page.getByRole('heading', { level: 1, name: 'Khám bệnh' })).toBeVisible()
    const waiting = await chipCount(page, 'Chờ khám')
    const done = await chipCount(page, 'Đã khám')
    expect(waiting).toBeGreaterThan(0)

    await page.locator('main').getByRole('button', { name: /^Chờ khám \(/ }).click()
    await page.locator('main tbody tr').first().click()

    const main = page.locator('main')
    await expect(main.getByRole('complementary', { name: 'Hàng chờ khám' })).toBeVisible()
    await main.getByRole('textbox', { name: 'Chiều cao (cm)' }).fill('95')
    await main.getByRole('textbox', { name: 'Cân nặng (kg)' }).fill('14')

    await main.getByRole('textbox', { name: /Tìm hoặc thêm chẩn đoán/ }).fill('J02')
    await page.getByRole('option', { name: /J02\.9/ }).click()
    await expect(main.getByText('Viêm họng cấp, không đặc hiệu')).toBeVisible()

    await main.getByRole('textbox', { name: 'Tìm theo tên thuốc, hoạt chất' }).fill('Para')
    await page.getByRole('option', { name: /Paracetamol 250mg/ }).click()
    await expect(main.getByRole('spinbutton', { name: 'Số lượng Paracetamol 250mg' })).toHaveValue('6')

    await main.getByRole('button', { name: 'Hoàn thành' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã hoàn thành khám' })).toContainText('J02.9')

    // Đếm lại ở danh sách: chờ giảm 1, đã khám tăng 1
    await main.getByRole('button', { name: 'Danh sách' }).click()
    await expect.poll(() => chipCount(page, 'Chờ khám')).toBe(waiting - 1)
    expect(await chipCount(page, 'Đã khám')).toBe(done + 1)
    expect(errors).toEqual([])
  })
})

test.describe('Thu tiền', () => {
  test('thu đủ tiền một lượt chưa thanh toán → dòng chuyển "Đã thanh toán"', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')
    const row = page.locator('main tbody tr', { hasText: 'Chưa thanh toán' }).first()
    const code = (await row.locator('td').nth(1).innerText()).trim()
    expect(code).toMatch(/^YMD\d+$/)

    // Ô "Chưa thanh toán" là nút thật: bấm là mở hộp Thu tiền
    await row.getByRole('button', { name: `Thu tiền lượt ${code}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Thu tiền' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(code)).toBeVisible()
    await dialog.getByRole('button', { name: 'Thanh toán', exact: true }).click()
    await expect(dialog).toHaveCount(0)

    // Đóng phiếu thu rồi xem lại dòng trong bảng
    await page.keyboard.press('Escape')
    await expect(page.locator('main tbody tr', { hasText: code })).toContainText('Đã thanh toán')
    expect(errors).toEqual([])
  })
})
