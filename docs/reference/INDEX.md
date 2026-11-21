# Danh mục ảnh tham chiếu

Ảnh nằm ở `docs/reference/screenshots/` (đã đưa vào `.gitignore`, không commit).
Tên file giữ số thứ tự chụp gốc (`001_…` → `176_…`), nên đọc theo số là đúng luồng thao tác.
Lô ảnh chụp ngày 13/11/2026; người dùng cho biết **chưa phải toàn bộ**.

> Ghi chú nguồn: thanh địa chỉ trong một số ảnh cho thấy đây là một sản phẩm SaaS thương mại
> (không phải mã nguồn mở như ghi trong tài liệu bàn giao). Dự án chỉ tham khảo bố cục/luồng;
> giữ thương hiệu riêng (ClinicHIS / Phòng khám Nhi Khoa), không dùng tên, logo hay tên đối tác của sản phẩm gốc.

Trạng thái: ✅ đã làm · 🟡 làm một phần · ⬜ chưa làm · ⛔ loại trừ theo yêu cầu

**Cập nhật 17/11/2026:** mọi module có ảnh đã làm xong (chi tiết từng hạng mục trong [ROADMAP](../ROADMAP.md)).
Những gì không có ảnh giữ trang chờ — xem mục "Còn thiếu ảnh".

## Tổng hợp

| Thư mục | Module | Ảnh | Trạng thái |
| --- | --- | --- | --- |
| `00-tong-quan` | Tổng quan (dashboard) | 1 | ✅ |
| `01-le-tan` | Lễ tân | 22 | ✅ |
| `02-kham-benh` | Khám bệnh (gồm đơn thuốc, chỉ định CLS, thu tiền) | 28 | ✅ |
| `03-cls-chan-doan-hinh-anh` | Cận lâm sàng › Chẩn đoán hình ảnh | 12 | ✅ |
| `04-cls-xet-nghiem` | Cận lâm sàng › Xét nghiệm | 8 | ✅ |
| `05-cls-bao-cao` | Cận lâm sàng › Báo cáo | 6 | ✅ |
| `06-cls-thiet-lap` | Cận lâm sàng › Thiết lập | 10 | ✅ |
| `07-lich-hen` | Lịch hẹn | 1 | ✅ |
| `08-lich-lam-viec` | Lịch làm việc | 12 | ✅ |
| `09-thong-tin-phong-kham` | Thông tin phòng khám (hồ sơ bác sĩ) | 2 | ✅ |
| `10-benh-an-dien-tu` | Bệnh án điện tử | 15 | ✅ |
| `11-nguoi-benh` | Người bệnh | 14 | ✅ |
| `12-bao-cao` | Quản lý › Báo cáo | 21 | ✅ |
| `13-he-thong` | Quản lý › Hệ thống | 22 | ✅ |
| `99-loai-tru-nha-thuoc` | Nhà thuốc › Thiết lập | 2 | ⛔ |

## Chi tiết từng module

### 00 · Tổng quan
- 001 — Báo cáo tổng quan khi chưa có dữ liệu: 4 thẻ (Tổng doanh thu, Phòng khám, Dịch vụ trực tuyến, Doanh thu dịch vụ), biểu đồ lượt người bệnh, tỉ lệ khách mới/cũ, 3 thẻ người bệnh, cột phải checklist kích hoạt + thông báo.
- Dạng biểu đồ khi có dữ liệu xem thêm `12-bao-cao` (133–136).

### 01 · Lễ tân
- 002–009 — Danh sách trống; lịch chọn ngày; dropdown Trạng thái, Thanh toán; ngăn Tìm kiếm nâng cao (Phân loại: Đặt trước / Tại phòng khám / Chỉ định; Nguồn: Tại phòng khám / Bên ngoài); menu ẩn/hiện cột.
- 010 — Spotlight F1 tìm bệnh cũ.
- 011–012 — Form tiếp nhận toàn trang.
- 013–016 — Modal thêm chỉ định CLS, chọn nơi thực hiện, xác nhận huỷ thay đổi.
- 017–019 — Bảng có lượt khám; dropdown trạng thái trên dòng (Tiếp nhận / Huỷ lịch).
- 030 — Phiếu tiếp nhận in nhiệt (mã vạch, STT, bác sĩ, phòng) — ✅ F8 / tự in theo cài đặt.
- 031–033 — Modal Thu tiền đầy đủ (giảm giá VND/%, khách thanh toán, tiền thừa, phương thức) + thông tin hoá đơn điện tử Cá nhân/Doanh nghiệp — ✅ dùng chung với màn khám.
- ✅ Trạng thái thanh toán theo ảnh (Không thanh toán, Đã/Chưa/Một phần, Đã huỷ, Đã hoàn tiền, Thất bại); bộ lọc nâng cao rút về Phân loại + Nguồn như ảnh.

### 02 · Khám bệnh
- 020, 034 — Danh sách "Lịch khám" (cùng dạng bảng Lễ tân, trạng thái Chờ khám / Đã khám).
- 021–027 — Màn khám: cột trái hàng chờ (Chờ khám / Đang khám / Đã khám) + lịch sử bệnh; tab Thông tin, Lâm sàng, Cận lâm sàng, Chẩn đoán (ICD-10), Tái khám, Ghi chú; sinh hiệu, hỏi bệnh, yếu tố rủi ro; đơn thuốc (tìm thuốc, đơn mẫu); hẹn tái khám; thanh dưới Lưu F4 / Hoàn thành F9.
- 028–029 — Ngăn chi tiết lượt khám (Thông tin / Toa thuốc / CLS / Phiếu thu), xem trước đơn thuốc.
- 035–040 — Chỉ định CLS từ màn khám (combo mở rộng), danh sách chỉ định có trạng thái, in phiếu chỉ định.
- 041–044 — Thu tiền dịch vụ + CLS, hoá đơn, in phiếu bán hàng.
- 065–067 — CLS đã có kết quả, xem file kết quả.
- 068–071 — Kê thuốc dạng bảng (số ngày, liều sáng/trưa/chiều/tối, số lượng, cách dùng), in đơn, gửi đơn cho người bệnh.
- Bỏ qua theo phạm vi: tab "Nhà thuốc <đối tác>" và liên thông nhà thuốc bên ngoài.
- **Đã làm (16/11/2026):** danh sách Lịch khám; màn khám (hàng chờ, lịch sử bệnh + sao chép toa, thông tin + sửa hồ sơ, sinh hiệu/BMI, hỏi bệnh, yếu tố rủi ro, lâm sàng, chỉ định CLS + gửi F2, chẩn đoán ICD-10, kê đơn + đơn mẫu, hẹn tái khám, ghi chú); Lưu F4 / Hoàn thành F9 / Thu tiền F3 / Gửi đơn F8; xem trước in đơn thuốc & phiếu chỉ định; F9 ở Lễ tân mở thẳng màn khám.
- **Đã làm tiếp (17/11/2026):** modal Thu tiền đầy đủ + phiếu thu/hoá đơn (041–044); xem kết quả CLS ngay trong màn khám (065–067); ngăn chi tiết 4 tab Thông tin/Toa thuốc/CLS/Phiếu thu (028–029); nút F1/F2 trên Lịch khám và "+" ở hàng chờ.
- Còn là mô phỏng: gửi đơn thuốc cho người bệnh (không có kênh gửi thật).

### 03 · CLS › Chẩn đoán hình ảnh
- 045–051 — Danh sách phiếu chỉ định (mở rộng dòng: dịch vụ / thông tin người bệnh / phiếu chỉ định), lọc trạng thái thực hiện & trả kết quả, tìm kiếm nâng cao, cột hiển thị.
- 052–055 — Trả kết quả: soạn Mô tả / Kết luận / Đề nghị, chụp ảnh webcam, tải ảnh, in "Phiếu khác", thư mục kết quả.
- 056 — Trạng thái Hoàn thành / Có kết quả.

### 04 · CLS › Xét nghiệm
- 057–062 — Danh sách, trả kết quả bằng tải file PDF/ảnh (tối đa 5 tệp), xem trước PDF.
- 063–064 — Xem phiếu thu, hoá đơn.

### 05 · CLS › Báo cáo
- 118–122, 154 — Doanh thu cận lâm sàng: 4 thẻ số liệu, tab Tất cả / Nội bộ / Nhận từ ngoài / Gửi ra ngoài, chọn khoảng ngày nhanh, tìm kiếm nâng cao, xuất Excel.

### 06 · CLS › Thiết lập
- 123–131 — Danh mục CLS (tab Danh mục / Phân loại / Combo), nhập từ file Excel, thêm/sửa dịch vụ (giá, đơn vị, phân loại, phòng, trả kết quả, kiểu in).
- 132 — Cài đặt mẫu kết quả.

### 07 · Lịch hẹn
- 074 — Danh sách lịch hẹn trống, 3 thẻ (Danh sách lịch hẹn, Lịch tư vấn, Cuộc hội thoại).

### 08 · Lịch làm việc
- 075–086 — 3 tab Lịch cố định / Lịch nghỉ / Lịch làm việc linh hoạt; lịch tuần & tháng; modal thiết lập khung giờ theo thứ, điều chỉnh, thêm lịch nghỉ, thêm/điều chỉnh lịch linh hoạt.

### 09 · Thông tin phòng khám
- 087–088 — Form hồ sơ bác sĩ (ảnh, chuyên khoa, học hàm, bảng giá, thời gian làm việc, giới thiệu, chứng chỉ) + khung xem trước hồ sơ công khai.

### 10 · Bệnh án điện tử
- 089–090, 103–104 — Danh sách bệnh án, lọc trạng thái (Đang điều trị / Đã đóng) và ký số.
- 091–097 — Chi tiết: tab Bệnh án (hành chính, lý do vào viện, sinh hiệu, hỏi bệnh, khám bệnh, chẩn đoán), Phiếu điều trị (toa thuốc, kết quả CLS), Tổng kết bệnh án.
- 098–101 — Bản in "Bệnh án ngoại trú".

### 11 · Người bệnh
- 102, 105 — Danh sách người bệnh.
- 106–107 — Thêm người bệnh (ngăn bên phải).
- 108, 114–117 — Hồ sơ người bệnh: thông tin trái, tab Lịch sử khám / Ghi chú, chỉnh sửa, xoá.
- 109–113 — Ngăn chi tiết lượt khám (Thông tin / Toa thuốc / CLS / Phiếu thu), hoá đơn.

### 12 · Quản lý › Báo cáo
- 133–136 — Báo cáo tổng quan (thẻ người bệnh, lượt đến khám, tỉ lệ mới/cũ, tần suất, giới tính, độ tuổi, CLS & thuốc phổ biến).
- 135, 137–140 — Doanh thu bán hàng (lọc kỳ, phạm vi, phương thức thanh toán). Bỏ phần doanh thu nhà thuốc.
- 141 — Chẩn đoán ICD. 142 — Dịch vụ chưa thu.
- 143–148 — Hoá đơn phòng khám (trạng thái hoá đơn điện tử, kỳ nhanh).
- 149–150 — Báo cáo khám bệnh (gom theo ngày / bác sĩ).
- 151–152 — Sổ khám bệnh. 153 — Lịch sử tải về.

### 13 · Quản lý › Hệ thống
- 155 — Thông tin phòng khám. 156–157 — Tài khoản cá nhân (chữ ký số, đổi mật khẩu). 158 — Giao diện (Hệ thống / Sáng / Tối, ngôn ngữ).
- 159 — Cài đặt chung (tiền tố mã, phòng lab mặc định, liên thông đơn thuốc).
- 160–167 — Cơ cấu tổ chức: Chuyên khoa, Khu khám, Phòng, Bác sĩ, Loại hình khám, Đối tượng khám.
- 168–170 — Tiền công khám. 171–174 — Nhật ký truy cập bệnh án. 175–176 — Nhân viên.

### 99 · Loại trừ
- 072–073 — Nhà thuốc › Thiết lập: **không làm** (đã loại trừ Nhà thuốc).
- Các mục Sidebar Nhà thuốc, Học CME, Tin tức xuất hiện trong ảnh cũng **không làm**.

## Còn thiếu ảnh
- Tư vấn trực tuyến: Cuộc gọi, Tin nhắn.
- Đặt khám thông minh: Phát triển thương hiệu.
- Báo cáo: Đối soát thanh toán, Báo cáo khám mới.
- Hệ thống: Hoá đơn điện tử.
- CLS Thiết lập: tab Phân loại, Combo.
- Tổng quan khi có dữ liệu (có thể dùng tạm 133–136).

## Quyết định đã chốt (17/11/2026)
- **Không có trong ảnh thì không làm.** Các mục ở "Còn thiếu ảnh" hiển thị trang chờ.
- Mục **"Kê đơn"** trên Sidebar là phần thêm ngoài ảnh → giữ trang chờ; kê đơn thực hiện trong màn Khám bệnh.
- Màn Lễ tân đã theo ảnh: trạng thái thanh toán, bộ lọc nâng cao, modal Thu tiền, in phiếu F8.
