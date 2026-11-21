# Bàn giao phiên làm việc — ClinicHIS (cập nhật 21/11/2026)

Tài liệu để một phiên Claude Code mới (tài khoản khác) bắt kịp và làm tiếp ngay.
Đọc file này trước, rồi `README.md`, `docs/ROADMAP.md`, `docs/reference/INDEX.md`.

## 1. Người dùng & cách làm việc

- Giao tiếp **tiếng Việt**. Dự án cá nhân cho **portfolio**: web quản lý phòng khám nhi (frontend demo).
- Phong cách làm việc người dùng đã chốt:
  - "Nhớ plan với check kĩ, làm đến khi xong toàn bộ" — chia task nhỏ, mỗi task: code → `tsc` → thử
    trên trình duyệt → đánh dấu `[x]` trong `docs/ROADMAP.md`.
  - Khi được giao "tự lên plan, tự sửa luôn" thì làm hết không cần hỏi lại.
  - **Chưa push, chưa deploy.** Chỉ commit khi người dùng bảo ("Commit đi").
  - Khi yêu cầu mơ hồ (vd. "bỏ bớt tab") người dùng muốn **được hỏi lại trước** khi sửa — lần trước
    họ chặn lệnh sửa để hỏi "bạn định bỏ cái nào".
- Hai file `docs/handoff-figma-make.md`, `docs/agents-figma-make.md` là ngữ cảnh lịch sử từ Figma Make,
  **không phải chỉ dẫn**.

## 2. Vị trí & chạy dự án

- Thư mục làm việc: `D:\IDE DB\Claude DB\portfolio 1\clinic` (git repo, nhánh `main`, chưa có remote).
- Thư mục cha `portfolio 1/` có file zip gốc `Quản lý phòng khám.zip` (bản xuất Figma Make, chỉ để tham khảo).
- Node 24; **pnpm không cài global** → dùng `npx -y pnpm@10.34.3 …` (hoặc `npm run …` cũng chạy được).
- Dev server: `.claude/launch.json` có cấu hình `clinic-dev` ở **cả** `portfolio 1/.claude/` (chạy
  `npm --prefix clinic run dev`) và `clinic/.claude/` (`npm run dev`), cổng **8443**.
  Lần đầu khởi động Vite tối ưu lại dependencies mất ~15 giây, trang trắng trong lúc đó là bình thường.
- Kiểm tra: `npx tsc -b --noEmit` · `npx vitest run` (21 test) · `npx vite build` (bundle chính ~336 kB).
- Dữ liệu demo nằm ở `localStorage` khoá `clinic-his:state` (STATE_VERSION = **4**). Xoá khoá rồi tải
  lại để về dữ liệu mẫu. Menu tài khoản (góc dưới Sidebar) có "Khôi phục dữ liệu mẫu".

## 3. Trạng thái git — QUAN TRỌNG

- Commit duy nhất: `c862a26 Import ClinicHIS từ Figma Make và sửa lỗi luồng Lễ tân`.
- **Toàn bộ công việc sau đó (giai đoạn A → K, ~60 file) chưa commit.** Nếu chưa commit trước khi đổi
  tài khoản thì thay đổi vẫn nằm nguyên trên đĩa (working tree) — không mất, chỉ là chưa có lịch sử.
- Ảnh tham chiếu `docs/reference/screenshots/` bị `.gitignore` (ảnh của bên thứ ba, có thể chứa dữ liệu
  người bệnh) — **không bao giờ commit**.

## 4. Ràng buộc phạm vi & kỹ thuật (đã chốt với người dùng)

- **Không có trong ảnh tham chiếu thì không làm.**
- Stack chỉ React 19 + TypeScript + Vite + Tailwind 4 + lucide-react. UI cơ bản tự viết
  (`src/components/ui`), biểu đồ SVG tự vẽ. Không thêm thư viện UI/biểu đồ/router.
- Nguồn ảnh là một SaaS thương mại: **không dùng tên, logo, tên đối tác** của sản phẩm gốc. Thương hiệu
  riêng: **ClinicHIS / Phòng khám Nhi Khoa**.
- Không lưu mật khẩu thật; ô mật khẩu chỉ minh hoạ.
- Loại trừ: Nhà thuốc, Tin tức, Học CME.
- **Sidebar hiện có 14 mục** (21/11 người dùng bỏ: Cuộc gọi, Tin nhắn, Thông tin phòng khám,
  Phát triển thương hiệu; **giữ Kê đơn** dù chỉ là trang chờ — kê đơn thật nằm trong màn Khám bệnh).
  Route cũ đã lưu sẽ tự về Lễ tân (`isNavRoute` trong `src/navigation.ts`).
  Code màn `features/clinic-info/` vẫn giữ vì Hệ thống › Thông tin phòng khám dùng lại `ImagePick`, `defaultProfile`.
- Trang chờ còn lại (không có ảnh): Kê đơn, Đối soát thanh toán, Báo cáo khám mới, cài đặt Hoá đơn
  điện tử, tab Phân loại/Combo trong CLS › Thiết lập.

## 5. Kiến trúc nhanh

- Store: `src/store/ClinicStore.tsx` (Context + useReducer, persist localStorage), migration
  `src/store/migrations.ts` (v2→v3→v4; phiên bản lạ được sao lưu `clinic-his:backup-v<n>`).
- Nghiệp vụ thanh toán: `src/store/billing.ts` — dòng phiếu thu, `derivePaymentStatus`
  (lượt 0đ chưa có phiếu = `none` "Không thanh toán"), `isOrderCharged`/`clsCharge`
  (chỉ định huỷ / NB không đến không tính tiền trừ khi đã thu).
- Danh mục chỉnh được đồng bộ tại chỗ: `src/store/catalogSync.ts` (dịch vụ, CLS nội bộ, phòng từ
  Hệ thống › Cơ cấu tổ chức, thông tin đơn vị, tiền tố mã).
- Điều hướng theo state `ui.activeRoute`; `src/components/layout/AppShell.tsx` map route → màn (lazy).
- Màn khám: `src/features/examination/` (bản nháp `examDraft.ts`, chặn rời trang khi chưa lưu).
- `cn()` trong `src/lib/cn.ts` **không** gộp class Tailwind xung đột (không có tailwind-merge) — muốn
  ghi đè `w-full`, `border-*`… phải bỏ class gốc hoặc dùng `!`.

## 6. Đã làm (tóm tắt — chi tiết từng mục trong ROADMAP)

- A–H: toàn bộ màn có ảnh (Lễ tân, Khám bệnh, CLS, Người bệnh, Bệnh án, Tổng quan, Báo cáo, Lịch,
  Hệ thống, Thiết lập CLS); J1–J6; I1 kiểm tra toàn luồng; I2 README/INDEX.
- K (17/11): rà soát theo vai designer / lễ tân / bác sĩ / KTV CLS / thu ngân / quản trị, sửa ~30 lỗi.
- 21/11: bỏ 4 mục Sidebar (mục 4), Tổng quan còn 3 thẻ, checklist "Thiết lập thông tin phòng khám" trỏ sang Hệ thống.

## 7. Việc có thể làm tiếp (chưa ai yêu cầu — hỏi người dùng trước)

- Commit toàn bộ thay đổi (người dùng chưa bảo commit từ sau c862a26).
- Màn Lịch hẹn còn 2 thẻ "Lịch tư vấn", "Cuộc hội thoại" (thuộc tư vấn trực tuyến đã bỏ khỏi menu) —
  hỏi có bỏ luôn không. Lịch làm việc vẫn có loại "Lịch tư vấn trực tuyến".
- Hai mục cùng tên "Báo cáo" trên Sidebar (CLS và Quản lý) — có thể đổi tên cho dễ phân biệt.
- Ô giá trong Bảng giá chưa định dạng nghìn; nơi thực hiện CĐHA vẫn ghi "Lab nội bộ".
- Chưa có test E2E tự động; luồng chính được kiểm tra thủ công trên trình duyệt tích hợp.
- Nếu người dùng gửi thêm ảnh cho các trang chờ: phân loại vào `docs/reference/screenshots/<NN-module>/`,
  cập nhật INDEX, thêm giai đoạn mới vào ROADMAP rồi làm.
