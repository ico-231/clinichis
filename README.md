# ClinicHIS — Quản lý phòng khám Nhi Khoa (demo frontend)

Ứng dụng web quản lý phòng khám ngoại trú, dựng cho portfolio. Toàn bộ chạy trên trình duyệt:
không có backend, dữ liệu lưu ở `localStorage`. Giao diện tiếng Việt, theo bố cục và luồng thao tác
của bộ ảnh tham chiếu nội bộ (xem [docs/reference/INDEX.md](docs/reference/INDEX.md)). Thương hiệu
dùng trong app là **ClinicHIS / Phòng khám Nhi Khoa**.

> ⚠️ Đây là bản demo. Không nhập dữ liệu y tế hay thông tin cá nhân thật. Các ô mật khẩu chỉ để
> minh hoạ, không lưu lại. Thanh toán, hoá đơn điện tử, gửi đơn thuốc đều là mô phỏng.

## Chạy thử

Cần Node 20.19+ (đã kiểm tra với Node 24). Dự án dùng pnpm; nếu máy chưa cài pnpm thì gọi qua `npx`:

```bash
npx -y pnpm@10.34.3 install
```

```bash
npx -y pnpm@10.34.3 dev
```

Các lệnh khác:

| Lệnh | Việc |
| --- | --- |
| `pnpm build` | Build production vào `dist/` (các màn được tách bundle, tải theo nhu cầu) |
| `pnpm preview` | Xem bản build |
| `pnpm test` | Chạy unit test (Vitest) |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript |

**Đặt lại dữ liệu mẫu:** xoá khoá `clinic-his:state` trong localStorage rồi tải lại trang. Khi
nâng cấp phiên bản dữ liệu, app tự chuyển đổi (migration); dữ liệu có phiên bản lạ được sao lưu
sang `clinic-his:backup-v<n>` trước khi dùng dữ liệu mẫu mới.

## Tính năng theo màn hình

| Màn | Nội dung chính |
| --- | --- |
| **Tổng quan** | Thẻ doanh thu, biểu đồ lượt khám theo ngày, tỉ lệ người bệnh mới/cũ, checklist kích hoạt |
| **Lễ tân** | Danh sách lượt khám theo ngày, lọc trạng thái/thanh toán/nâng cao, tiếp nhận bệnh cũ (tìm nhanh) và bệnh mới, chỉ định CLS, thu tiền, in phiếu tiếp nhận nhiệt, đổi trạng thái trên dòng |
| **Khám bệnh** | Lịch khám; màn khám với hàng chờ + lịch sử bệnh, sinh hiệu/BMI, hỏi bệnh, chỉ định CLS và xem kết quả, chẩn đoán ICD-10, kê đơn (đơn mẫu, tự tính số lượng), hẹn tái khám, ghi chú; thu tiền; in đơn thuốc / phiếu chỉ định |
| **Cận lâm sàng** | Chẩn đoán hình ảnh (soạn mô tả/kết luận, chụp webcam, tải ảnh, mẫu kết quả), Xét nghiệm (tải tệp PDF/ảnh), báo cáo doanh thu CLS, thiết lập danh mục dịch vụ & mẫu kết quả |
| **Người bệnh** | Danh sách, thêm/sửa/xoá, hồ sơ với lịch sử khám và ghi chú, ngăn chi tiết lượt khám 4 tab |
| **Bệnh án điện tử** | Danh sách, bệnh án / phiếu điều trị / tổng kết, ký, bản in bệnh án ngoại trú, nhật ký truy cập |
| **Lịch hẹn, Lịch làm việc** | Lịch cố định / nghỉ / linh hoạt theo tuần và tháng |
| **Báo cáo** | Tổng quan, doanh thu bán hàng, chẩn đoán ICD, dịch vụ chưa thu, hoá đơn, khám bệnh, sổ khám bệnh, lịch sử tải về; xuất CSV |
| **Hệ thống** | Thông tin phòng khám, tài khoản, giao diện sáng/tối, cài đặt chung (tiền tố mã, lab mặc định), cơ cấu tổ chức, tiền công khám, nhân viên, nhật ký bệnh án |

## Phím tắt

Phím chữ (Shift + …) không chạy khi đang gõ trong ô nhập. Khi có hộp thoại mở, phím F của màn phía sau bị chặn; Esc đóng lớp trên cùng.

| Nơi | Phím |
| --- | --- |
| Lễ tân / Lịch khám | **F1** tìm bệnh cũ · **F2** tiếp nhận bệnh mới |
| Form tiếp nhận | **Shift+C** thêm chỉ định CLS · **F3** thu tiền · **F8** lưu và in phiếu · **F9** lưu và vào khám · **F10** đăng ký khám |
| Màn khám | **Shift+C** thêm chỉ định · **F2** gửi chỉ định · **F3** thu tiền · **F4** lưu · **F8** gửi đơn thuốc · **F9** hoàn thành |
| Hộp chỉ định CLS | **Shift+T** tạo chỉ định |
| Hộp thu tiền / trả kết quả XN | **F9** xác nhận |
| Phiếu thu | **F8** in |
| Trả kết quả CĐHA | **F8** chụp ảnh |
| Ô chọn có tìm kiếm | **↑/↓** chọn dòng · **Enter** xác nhận |

## Kiến trúc

- **Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react. Không dùng thư viện UI hay
  biểu đồ; các thành phần giao diện cơ bản tự viết trong `src/components/ui`, biểu đồ là SVG tự vẽ.
- **State:** một store React Context + `useReducer` (`src/store/ClinicStore.tsx`), lưu xuống
  `localStorage`. Người bệnh, lượt khám, chỉ định, phiếu thu dùng chung cho mọi màn.
- **Điều hướng:** theo state (`ui.activeRoute`), không dùng router, để sau này dễ chuyển sang
  Next.js App Router. Màn Lễ tân tải sẵn, các màn khác tải lười (`React.lazy`).
- **Thư mục:**
  - `src/store/` — kiểu dữ liệu, reducer, dữ liệu mẫu, migration, nghiệp vụ thanh toán (`billing.ts`), danh mục thuốc/ICD-10
  - `src/features/<module>/` — mỗi màn một thư mục
  - `src/components/` — layout, UI dùng chung, biểu đồ, phiếu in
  - `src/lib/` — ngày giờ, định dạng, CSV, tệp, phím tắt, giao diện sáng/tối
- **In ấn:** khối `.print-area` trong hộp xem trước, dùng CSS `@media print`.
- **Test:** `src/**/*.test.ts` — nghiệp vụ thanh toán, migration, bộ lọc Lễ tân, tính liều/BMI, mã khám.

## Phạm vi

- **Có ảnh tham chiếu thì làm, không có thì không.** Các mục còn là trang chờ: Kê đơn (mục riêng
  trên Sidebar — kê đơn thực hiện trong màn Khám bệnh), Đối soát thanh toán, Báo cáo khám mới,
  cài đặt Hoá đơn điện tử, tab Phân loại/Combo trong thiết lập CLS.
- **Loại trừ theo yêu cầu:** Nhà thuốc, Tin tức, Học CME; bỏ khỏi menu: Tư vấn trực tuyến (Cuộc gọi,
  Tin nhắn), Thông tin phòng khám (hồ sơ bác sĩ công khai), Phát triển thương hiệu. Thông tin đơn vị
  (tên, địa chỉ, logo dùng trên bản in) vẫn chỉnh ở Hệ thống › Thông tin phòng khám.
- Ảnh tham chiếu (`docs/reference/screenshots/`) không được commit vì là ảnh của bên thứ ba.

## Tài liệu

- [docs/ROADMAP.md](docs/ROADMAP.md) — lộ trình theo giai đoạn và trạng thái từng hạng mục
- [docs/reference/INDEX.md](docs/reference/INDEX.md) — danh mục ảnh tham chiếu theo module
- [docs/handoff-figma-make.md](docs/handoff-figma-make.md) — bối cảnh lúc chuyển từ Figma Make (lịch sử)
