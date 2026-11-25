# Lộ trình hoàn thiện theo ảnh tham chiếu

Mỗi task nhỏ, có ảnh tham chiếu (số trong `docs/reference/screenshots/`) và tiêu chí "xong".
Quy ước: làm xong task nào thì typecheck + thử trên trình duyệt rồi mới đánh dấu `[x]`.
Phạm vi loại trừ: Nhà thuốc (bán lẻ / bán theo toa / hoá đơn thuốc / liên thông nhà thuốc đối tác), Tin tức, Học CME.
Cập nhật 21/11/2026: Cuộc gọi, Tin nhắn, Thông tin phòng khám, Phát triển thương hiệu đã **bỏ khỏi menu** (xem K7).
Quyết định của người dùng (17/11/2026): làm một mạch tới xong hẳn. Các mục **chưa có ảnh giữ trang chờ**: Cuộc gọi, Tin nhắn, Phát triển thương hiệu, Đối soát thanh toán, Báo cáo khám mới, cài đặt Hoá đơn điện tử, tab Phân loại/Combo trong CLS › Thiết lập, và mục **"Kê đơn"** trên Sidebar (mục thêm ngoài ảnh – giữ trang chờ, không làm). Nguyên tắc: **không có trong ảnh thì không làm**; riêng J4–J6, I2 là việc kỹ thuật (dữ liệu mẫu, migration, test, tài liệu) để các màn trong ảnh chạy ổn định.

## Giai đoạn A — Thanh toán & phiếu thu (dùng chung Lễ tân / Khám bệnh)

- [x] A1. Model phiếu thu: dòng thu theo từng dịch vụ (công khám, từng CLS), giảm giá dòng + giảm giá tổng, tiền khách đưa, mã phiếu, người thu, thông tin hoá đơn. Tương thích dữ liệu cũ. *(Xong: tsc qua, dữ liệu cũ vẫn tính đúng đã thu / còn lại.)*
- [x] A2. Modal **Thu tiền** đầy đủ (031, 041): bảng dịch vụ có checkbox theo nhóm Công khám / Cận lâm sàng, giảm giá VNĐ/% từng dòng, tổng, giảm giá dịch vụ, khách cần trả, khách thanh toán, tiền thừa, phương thức; Đóng ESC / Thanh toán F9. *(Xong: thu một phần dịch vụ → dòng đó "Đã thanh toán", dòng còn lại vẫn chờ thu.)*
- [x] A3. Thông tin **hoá đơn điện tử** Cá nhân / Doanh nghiệp (032, 033) + công tắc "Phát hành hoá đơn cho dịch vụ". *(Xong: lưu kèm phiếu thu, kiểm tra trường bắt buộc.)*
- [x] A4. Modal **Phiếu thu / Hoá đơn** sau thanh toán (042, 064): tab Dịch vụ / Thuốc, thông tin thanh toán, Phát hành hoá đơn (mô phỏng), In phiếu bán hàng F8. *(Xong: mở tự động sau khi thanh toán.)*
- [x] A5. Bản in **Phiếu bán hàng** (043). *(Xong: xem trước đúng dòng, giảm giá, tổng.)*
- [x] A6. Trạng thái thanh toán **từng chỉ định CLS** ở màn khám dựa theo dòng đã thu (039, 044). *(Xong: thu CK riêng thì CLS vẫn "Chưa thanh toán".)*

## Giai đoạn B — Lễ tân còn thiếu

- [x] B1. In **phiếu tiếp nhận** F8 (030): STT, mã vạch giả lập, bác sĩ, phòng, người bệnh, người thân. Nút F8 ở form tiếp nhận và trong ngăn chi tiết.
- [x] B2. Dropdown trạng thái trên dòng chỉ hiện bước hợp lệ: Đã đăng ký → "Tiếp nhận" / "Huỷ lịch" (019).
- [x] B3. Tìm kiếm nâng cao theo ảnh (006–008): Phân loại (Đặt trước / Tại phòng khám / Chỉ định), Nguồn (Tại phòng khám / Bên ngoài). Giữ các trường đang có nếu không mâu thuẫn.

## Giai đoạn C — Ngăn chi tiết lượt khám (dùng ở Khám bệnh, Người bệnh)

- [x] C1. Ngăn chi tiết 4 tab **Thông tin lượt khám / Toa thuốc / Cận lâm sàng / Phiếu thu** (028, 029, 109–113).
- [x] C2. Tab Toa thuốc hiển thị bản xem trước đơn thuốc; tab Phiếu thu liệt kê phiếu, bấm mở modal phiếu thu (A4).

## Giai đoạn D — Cận lâm sàng: Chẩn đoán hình ảnh & Xét nghiệm

- [x] D1. Model trạng thái thực hiện (Chờ thực hiện / Đang thực hiện / Hoàn thành / Đã huỷ / NB không đến) + trạng thái trả kết quả + nội dung kết quả.
- [x] D2. Danh sách phiếu chỉ định CĐHA (045–051): bộ lọc ngày nhanh, phòng CLS, trạng thái thực hiện, trạng thái trả KQ, nâng cao, cột hiển thị; dòng mở rộng 3 tab.
- [x] D3. Trả kết quả CĐHA (052–056): Mô tả / Kết luận / Đề nghị, ảnh (tải ảnh lên; chụp webcam nếu trình duyệt cho phép), Lưu kết quả F9, Lưu & in.
- [x] D4. Danh sách Xét nghiệm (057) + trả kết quả bằng tệp PDF/ảnh tối đa 5 tệp (058–062).
- [x] D5. Xem kết quả từ màn khám (065–067): tab Kết quả, nút "Xem kết quả".

## Giai đoạn E — Người bệnh & Bệnh án điện tử

- [x] E1. Danh sách Người bệnh (102, 105) + Thêm người bệnh dạng ngăn phải (106–107).
- [x] E2. Hồ sơ người bệnh (108, 114–117): thông tin trái, tab Lịch sử khám / Ghi chú, Chỉnh sửa, Xoá (xác nhận).
- [x] E3. Danh sách Bệnh án điện tử (089–090, 103–104).
- [x] E4. Chi tiết bệnh án 3 tab Bệnh án / Phiếu điều trị / Tổng kết (091–097), đóng bệnh án, ký số (mô phỏng).
- [x] E5. Bản in Bệnh án ngoại trú (098–101).

## Giai đoạn F — Tổng quan & Báo cáo

- [x] F1. Tổng quan (001) với số liệu thật từ store.
- [x] F2. Báo cáo tổng quan (133–136): thẻ, biểu đồ lượt khám, tỉ lệ mới/cũ, giới tính, độ tuổi, CLS phổ biến, thuốc phổ biến.
- [x] F3. Doanh thu bán hàng (135, 137–140) — bỏ phạm vi Nhà thuốc.
- [x] F4. Chẩn đoán ICD (141), Dịch vụ chưa thu (142).
- [x] F5. Hoá đơn phòng khám (143–148).
- [x] F6. Báo cáo khám bệnh (149–150), Sổ khám bệnh (151–152), Lịch sử tải về + xuất CSV/Excel (153).
- [x] F7. CLS › Báo cáo doanh thu cận lâm sàng (118–122, 154).

## Giai đoạn G — Lịch & thông tin phòng khám

- [x] G1. Lịch làm việc: Lịch cố định (075, 078–081).
- [x] G2. Lịch nghỉ (076, 082–084), Lịch linh hoạt (077, 085–086).
- [x] G3. Lịch hẹn (074).
- [x] G4. Thông tin phòng khám – hồ sơ bác sĩ + xem trước (087–088).

## Giai đoạn H — Hệ thống & Thiết lập CLS

- [x] H1. Thông tin phòng khám, Tài khoản cá nhân, Giao diện (155–158).
- [x] H2. Cài đặt chung (159).
- [x] H3. Cơ cấu tổ chức 6 tab (160–167), Tiền công khám (168–170).
- [x] H4. Nhật ký truy cập bệnh án (171–174), Nhân viên (175–176).
- [x] H5. CLS › Thiết lập: danh mục, thêm/sửa, nhập file, mẫu kết quả (123–132).

## Giai đoạn J — Bổ sung theo yêu cầu

- [x] J1. Nút Thêm bệnh cũ F1 / Thêm bệnh mới F2 trên danh sách Lịch khám (020, 034); nút "+" ở cột trái màn khám (021).
- [x] J2. Giao diện Sáng / Tối / Theo hệ thống hoạt động thật cho toàn app (158).
- [x] J3. Tổng quan khi chưa có dữ liệu: checklist kích hoạt + khung thông báo (001).
- [x] J4. Dữ liệu mẫu đủ cho mọi màn: CLS có kết quả, lịch làm việc, nhân viên, phiếu thu có dòng…
- [x] J5. Migration localStorage khi đổi cấu trúc dữ liệu, không xoá dữ liệu cũ.
- [x] J6. Test tự động (Vitest) cho tính tiền, bộ lọc, mã KB/STT.

## Giai đoạn I — Hoàn thiện

- [x] I1. Kiểm tra toàn bộ luồng Lễ tân → Khám → CLS → Thu tiền → Báo cáo trên trình duyệt (17/11: tiếp nhận F9 → khám, sinh hiệu/BMI → 2 chỉ định CLS gửi F2 → thu tiền có mã phiếu → phòng XN trả kết quả → màn khám "Có kết quả", xem tệp → chẩn đoán ICD → Hoàn thành → Lễ tân/Tổng quan cập nhật; 18 mục menu mở không lỗi console. Sửa kèm: ô chọn có tìm kiếm nhận ↑/↓/Enter; ô chẩn đoán đóng gợi ý khi Tab).
- [x] I2. README, cập nhật INDEX.md và tài liệu bàn giao (17/11).

## Giai đoạn K — Rà soát theo vai (17/11/2026)

- [x] K1. Designer: nhãn trạng thái bị cắt, % biểu đồ tròn bị cắt, dòng Bảng giá vỡ bố cục, nút Lưu & in phiếu đè chữ, tab mục màn khám xuống dòng, menu trái xuống dòng khi đổi độ rộng, tooltip cho địa chỉ / ô lịch bị cắt, tương phản màu (nút xanh lá, avatar, logo, STT, link ở chế độ tối), nút ẩn hiện khi dùng bàn phím.
- [x] K2. Lễ tân: tìm người bệnh không bị giới hạn bởi khoảng ngày; Lễ tân không còn "Hoàn tất khám" thay bác sĩ (thay bằng "Mở màn khám").
- [x] K3. Bác sĩ: điền sẵn dị ứng từ hồ sơ + cảnh báo ở đơn thuốc; hỏi xác nhận khi hoàn thành chưa có chẩn đoán; chỉ định gửi lúc hoàn thành có trạng thái "chờ kết quả".
- [x] K4. Kỹ thuật viên CLS: chỉ định huỷ / NB không đến không còn bị tính tiền (trừ khi đã thu); huỷ lượt khám thì huỷ các chỉ định chưa làm; tiêu đề "Cập nhật kết quả" khi đã có kết quả.
- [x] K5. Thu ngân: lượt 0đ là "Không thanh toán" (không sinh phiếu thu 0đ, nút "Miễn phí"); đơn vị dòng CLS theo danh mục; báo cáo không hiện "▲100%" khi kỳ trước trống.
- [x] K6. Quản trị: phòng ở Cơ cấu tổ chức đồng bộ với danh mục phòng (migration v3→v4); giữ giá công khám đã chốt khi đổi bảng giá; dịch vụ mặc định an toàn; bệnh án lượt cũ mặc định "Đã đóng".
- [x] K7. (21/11) Bỏ khỏi Sidebar theo yêu cầu: Cuộc gọi, Tin nhắn, Thông tin phòng khám, Phát triển thương hiệu (giữ Kê đơn). Route đã lưu cũ tự về Lễ tân; Tổng quan bỏ thẻ "Dịch vụ trực tuyến" và 2 mục kích hoạt tư vấn; "Thiết lập thông tin phòng khám" trỏ sang Hệ thống.
- [x] K8. (22/11) Lịch hẹn bỏ 2 thẻ "Lịch tư vấn", "Cuộc hội thoại" và bộ lọc "Loại hình" (chỉ còn lịch khám); mục Báo cáo trong nhóm Cận lâm sàng đổi tên "Báo cáo CLS" (nhóm Quản lý giữ "Báo cáo"). Bỏ ô gói tài khoản "Standard / Nâng cấp ngay" ở chân Sidebar (và cờ `ui.upgradeCardDismissed`). Nơi thực hiện CĐHA giữ nguyên (đã chọn được đơn vị khác trong hộp chỉ định). Sửa kèm: Tailwind không quét `docs/` nữa (`@source not '../docs'` trong `src/index.css`) — đường dẫn Windows trong HANDOFF bị đọc thành mã thoát CSS làm dev server và `vite build` lỗi "Invalid code point".
- [x] K9. (22/11) Đơn vị CLS bên ngoài đổi sang **tên giả** (mã, tên, địa chỉ): An Bình, Hoa Sen, Tân Phát, Việt An, Minh Tâm; Lab nội bộ đặt tại "Tầng 2 - Phòng khám Nhi Khoa". Migration v4→v5 đổi cả dữ liệu đã lưu (`PROVIDER_RENAMES` trong `src/store/migrations.ts` — nơi duy nhất còn giữ tên cũ để ánh xạ), STATE_VERSION = 5, thêm test.

## Giai đoạn L — Tự review & cải thiện theo vai (22/11/2026)

Người dùng giao "tự review toàn bộ theo vai designer / user / PM, sửa đến khi ổn, không cần hỏi". Làm trên nhánh
`review/2026-11-22`, mỗi nhóm một commit để rollback từng phần (xem HANDOFF mục 3).

- [x] L1. Bố cục: biểu đồ không đẩy rộng ô grid (thẻ donut Tổng quan đè cột phải ở 1280px); kiểm tra tự động 1440/1280/1024/390px.
- [x] L2. Điện thoại (< 768px): menu trái thành ngăn kéo; Hệ thống/Báo cáo dùng tab cuộn ngang; phân trang xuống dòng; ẩn gợi ý phím F; màn khám có ngăn kéo Hàng chờ.
- [x] L3. Điều khiển "giả": menu tài khoản (Hồ sơ cá nhân, Đăng xuất, Khôi phục dữ liệu có xác nhận); bộ lọc Lịch sử tải về, Phòng CLS; sắp xếp cột Lịch hẹn.
- [x] L4. Nghiệp vụ: không xoá người bệnh đã khám/đã có phiếu thu; khoá chỉ định đã thu/đã làm/có kết quả trong hộp chỉ định; lượt huỷ mở màn khám chỉ xem; bác sĩ lưu lượt chưa tiếp nhận => Đang khám; không thu tiền lượt huỷ; tiền thừa chỉ cho tiền mặt; phiếu thu không có dòng công khám 0đ; cảnh báo trùng hồ sơ (họ tên + ngày sinh/SĐT); bệnh án đã ký thì khoá, đã đóng chỉ xem + mở lại.
- [x] L5. Số liệu: hoàn tiền chia đúng theo tỉ lệ công khám/CLS đã thu (trước trừ hết vào công khám).
- [x] L6. Store: `getState` luôn mới nhất trong cùng sự kiện; đơn vị CLS trên phiếu thu theo danh mục; context tách ra `storeContext.ts` (sửa store khi dev không còn trắng trang).
- [x] L7. Truy cập (a11y): focus vào/giữ trong/trả về khi mở/đóng hộp thoại; aria-labelledby; nhãn nút icon; tương phản đạt WCAG AA ở chế độ sáng và tối (đo tự động mọi màn).
- [x] L8. Độ bền: Error Boundary từng màn (không trắng cả app, có Tải lại / Khôi phục dữ liệu mẫu); Tailwind không quét `docs/`.
- [x] L9. Dữ liệu minh hoạ: địa chỉ/SĐT phòng khám không trùng cơ sở thật (migration v5→v6); thống nhất chính tả huỷ/hoá; meta description.

## Giai đoạn M — Nâng cấp chất lượng kỹ thuật (22/11/2026)

Người dùng: "nâng cấp, cải thiện max, all out". Không thêm tính năng ngoài ảnh tham chiếu; tập trung độ tin cậy,
truy cập, hiệu năng, an toàn. Làm trên nhánh `upgrade/2026-11-22`, mỗi nhóm một commit.

- [x] M1. Kiến trúc store: reducer + thao tác nghiệp vụ tách sang `src/store/storeLogic.ts` (thuần, không React/DOM);
  `ClinicStore.tsx` chỉ còn Provider, lưu trữ, đồng bộ danh mục. Bật `noUnusedLocals` / `noUnusedParameters`, dọn mã thừa.
- [x] M2. Test luồng đầu-cuối trên store thật (`src/store/workflow.test.ts`, 23 test): tiếp nhận (mã BN, STT, thu đủ/thiếu,
  lượt 0đ, đặt lịch, bệnh cũ), khám thêm CLS sau khi đã thu, checkout giảm giá dòng + tổng, thu 2 lần liên tiếp,
  CLS huỷ/không đến, huỷ lượt có/không hoàn tiền, chặn xoá hồ sơ, chốt chặn rời trang. Test thư viện ngày/định dạng/CSV.
- [x] M3. Truy cập: nhãn hiển thị của mọi khung trường được gắn với ô nhập (`useControlLabel` — `aria-labelledby`,
  `aria-invalid`, `aria-describedby` khi lỗi); ô tìm kiếm, bảng thuốc, sinh hiệu có nhãn; ô chọn đọc cả giá trị;
  id gradient biểu đồ không trùng; chữ đỏ đạt AA; link "Bỏ qua menu"; viền tiêu điểm bàn phím thống nhất;
  tôn trọng "giảm chuyển động"; tiêu đề tab trình duyệt theo màn. Quét tự động 14 màn + form tiếp nhận + màn khám: 0 lỗi.
- [x] M4. Hiệu năng: lưu localStorage gom nhịp 400 ms (ghi ngay khi đóng tab / chuyển nền); ô tìm kiếm Lễ tân giữ state
  cục bộ khi gõ (118 → 23 ms mỗi phím ở chế độ dev).
- [x] M5. An toàn: CSV xuất báo cáo chống CSV injection (ô bắt đầu bằng = + - @); bộ làm sạch HTML kết quả bỏ hẳn
  script/style/iframe kèm nội dung.

## Giai đoạn N — Chuẩn bị 2.0 (nhánh `ui/2026-11`, 23–24/11/2026)

- [x] N1. Bỏ phím tắt theo yêu cầu: gỡ bắt phím F1–F10, Shift+C, Shift+T, Shift+Enter, Ctrl+Enter và nhãn phím trên nút
  (component `Kbd`, `src/lib/keyboard.ts`); giữ Esc đóng hộp thoại, Tab, mũi tên/Enter trong ô chọn.
- 24/11: người dùng bỏ mọi bản làm đẹp giao diện đã thử; code giao diện trả về đúng 1.0 (chỉ giữ N1). 2.0 sẽ thiết kế lại từ
  đầu, **chưa bắt đầu**. Bản thử cũ lưu ở `docs/2.0/luu-tru/` (mẫu HTML) và `docs/2.0/backup/ui-final-24-11.patch` (code).

## Giai đoạn O — Backend (Supabase + Vercel Functions, từ 24/11/2026)

Kế hoạch và cách chạy: [docs/BACKEND.md](BACKEND.md). App 1.0 vẫn dùng localStorage, chưa nối API.

- [x] O1. Migration `supabase/migrations/0001_init.sql` (patients, visits, catalog, settings, logs; hàm `create_patient`,
  `next_queue_number`; bật RLS), lớp `server/` (kho bộ nhớ + kho Supabase qua REST, không thêm thư viện), API
  `/api/patients` (danh sách/tìm, tạo, xem, sửa, xoá có chặn), 8 test.
- [x] O2. Lượt khám: `server/visits.ts` + `/api/visits` (danh sách lọc/tìm, đăng ký bệnh cũ/mới, cấp STT/mã khám/mã phiếu thu
  qua bộ đếm `counters`, đổi trạng thái theo luồng 1.0, huỷ có hoàn tiền), 9 test. Tổng 80 test.
- [x] O3. Thu tiền: `server/payments.ts` + `/api/visits/:id/payments` (tổng hợp, thu theo dòng có giảm giá dòng/tổng, giá lấy từ máy chủ,
  mã phiếu thu không trùng), hoá đơn điện tử theo phiếu; mã sinh chung ở `server/codes.ts`. 6 test. Tổng 86 test.
- [x] O4. Khám bệnh + CLS: `server/exam.ts` + API lưu khám, chỉ định (khoá như 1.0), gửi chỉ định, gửi đơn, hoàn thành
  (bắt buộc chiều cao/cân nặng, xác nhận khi chưa chẩn đoán), phòng CLS cập nhật/trả kết quả, `/api/orders`. 8 test. Tổng 94 test.
- [x] O5. Danh mục, cài đặt, báo cáo: `server/catalog.ts` (danh mục sửa được + chỉ đọc, mặc định của 1.0, hàm SQL `replace_catalog`),
  `/api/settings/:key`, `server/reports.ts` + `/api/reports/summary`; màn khám chỉ định được dịch vụ lab nội bộ thêm mới. 8 test. Tổng 102 test.
- [x] O6a. Chuẩn bị triển khai: `vercel.json`, `env.example`, `docs/DEPLOY.md`, script nạp dữ liệu mẫu 1.0 lên Supabase
  (`scripts/seed-supabase.script.ts`), khoá API bằng `CLINIC_API_KEY` + giới hạn 120 lần/phút/IP, lớp gọi API `src/api/client.ts`. Tổng 106 test, build ổn.
- [x] O6b. Lên Supabase/Vercel thật (24/11): GitHub `ico-231/clinichis`, Vercel `clinichis-ico18.vercel.app`, Supabase `clinichis`, API gộp 1 hàm, đã nạp dữ liệu mẫu và thử trên bản thật
- [x] O6c. Audit 25/11: ngày phải có thật (31/02 → 422 thay vì 500), đọc quá 1000 dòng Supabase (báo cáo dài không thiếu dữ liệu), chia lô truy vấn người bệnh, danh mục giữ thứ tự (cột `position`, migration 0002), cố định `search_path` hàm SQL, số phiếu thu không nhảy khi dữ liệu sai, trường hồ sơ sai kiểu → 422, lỗi tham chiếu không còn báo nhầm "trùng", giới hạn lượt gọi tính cả lần dò mã
- [x] O6d. Supabase tự nạp lại dữ liệu mẫu mỗi đêm (25/11): Vercel Cron 17:00 UTC → `/api/admin/reset-demo` (cần `CRON_SECRET`), hàm SQL `reset_demo_data` (migration 0003), dữ liệu mẫu tính theo giờ VN dù máy chủ chạy UTC. App 1.0 (localStorage) không đổi
- [ ] O7. Đăng nhập (để sau).

