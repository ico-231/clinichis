# Bàn giao phiên làm việc — ClinicHIS (cập nhật 26/11/2026)

Tài liệu để một phiên Claude Code hoặc Antigravity mới bắt kịp và làm tiếp ngay.
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

- Thư mục làm việc: `D:\IDE DB\Claude DB\portfolio 1\clinic` (git repo, nhánh làm việc hiện tại **`ui/2026-11`**, remote `origin` trỏ tới `ico-231/clinichis` do `[CC]` thiết lập 24/11).
- Thư mục cha `portfolio 1/` có file zip gốc `Quản lý phòng khám.zip` (bản xuất Figma Make, chỉ để tham khảo) cùng `AGENTS.md`, `BANG_VIEC.md`.
- Node 24; **pnpm không cài global** → dùng `npx -y pnpm@10.34.3 …` (hoặc `npm run …` cũng chạy được).
- Dev server: `.claude/launch.json` có cấu hình `clinic-dev` ở **cả** `portfolio 1/.claude/` (chạy
  `npm --prefix clinic run dev`) và `clinic/.claude/` (`npm run dev`), cổng **8443** cho Claude Code (`[CC]`) và **8444** cho Antigravity (`[AG]`, PowerShell: `$env:PORT=8444; npm --prefix clinic run dev`).
  Lần đầu khởi động Vite tối ưu lại dependencies mất ~15 giây, trang trắng trong lúc đó là bình thường.
- Tailwind bị chặn quét `docs/` (`@source not '../docs'` trong `src/index.css`): đường dẫn Windows kiểu dấu gạch ngược + hex trong tài liệu từng làm dev server trắng trang lỗi "Invalid code point". Đổi `@source` thì phải khởi động lại dev server.
- Kiểm tra: `npx tsc -b --noEmit` (bật `noUnusedLocals`/`noUnusedParameters`) · `npx vitest run` (**126 test** / 16 file) · `npx vite build` (bundle chính ~342 kB).
- Dữ liệu demo nằm ở `localStorage` khoá `clinic-his:state` (STATE_VERSION = **6**), tách biệt theo từng cổng (`8443` / `8444`). Xoá khoá rồi tải
  lại để về dữ liệu mẫu. Menu tài khoản (góc phải thanh `TopNav`) có "Khôi phục dữ liệu mẫu".
- `portfolio 1/CLAUDE.md` và `portfolio 1/GEMINI.md` nằm **ngoài** git repo (repo chỉ là `clinic/`), chỉ có trên máy này.

### Mẹo kiểm thử trên trình duyệt tích hợp (rút từ phiên trước)

- Mở bằng `preview_start` với `name: "clinic-dev"`. Pane hẹp (dưới 1024px) thì menu ngang thành nút ☰ mở ngăn kéo;
  muốn xem bố cục desktop dùng `resize_window` 1280×800 hoặc 1440×900, xong nhớ trả về preset `desktop`.
- Ảnh chụp màn hình đôi khi trả về khung cũ (trễ một nhịp, nhất là ngay sau khi chuyển màn lazy) —
  chụp lại lần nữa trước khi kết luận là lỗi.
- Điều khiển bằng `javascript_tool` nhanh hơn click toạ độ. Menu: mục "Tổng quan" là nút trực tiếp trong
  `nav[aria-label="Menu chính"]`; các nhóm là nút có `aria-expanded`, bấm mở rồi chọn `[role="menuitem"]` (chữ có thể kèm số đếm,
  vd. "Lễ tân8"). Tên người bệnh hiển thị IN HOA bằng CSS nên so khớp chữ phải bỏ phân biệt hoa thường. Input React cần gán qua
  native setter + `dispatchEvent(new Event('input', { bubbles: true }))`.
- (Đã sửa 22/11) Lỗi HMR `useClinicState phải nằm trong <ClinicProvider>` khi sửa store: context đã tách
  ra `src/store/storeContext.ts`. Sửa file có export không phải component (Modal.tsx, billing.ts…) vẫn có thể
  làm Vite tải lại cả trang — biến JS gán trên `window` khi kiểm thử sẽ mất, cần khai báo lại.
- Ô chọn dạng Popover (tỉnh/thành, ô chọn có tìm kiếm) không mở bằng `element.click()` trong `javascript_tool`
  (Popover đóng ngay vì không có mousedown) — dùng `find` + `computer left_click` theo ref.
- Pane trình duyệt bị ẩn thì ảnh chụp lệch khung: kiểm tra bố cục bằng đo DOM (getBoundingClientRect) thay vì ảnh.

### Lịch sử hội thoại đầy đủ (nếu cần tra chi tiết)

Transcript phiên trước nằm trên máy này:
`C:\Users\ndn231\.claude\projects\D--IDE-DB-Claude-DB-portfolio-1\f69546cf-35a5-45ed-8ba1-b03be0841969.jsonl`
(file lớn — chỉ grep khi cần, mọi quyết định quan trọng đã được tóm tắt ở file này).

## 3. Trạng thái git — QUAN TRỌNG

- `c862a26` Import ClinicHIS từ Figma Make và sửa lỗi luồng Lễ tân.
- `de9516a` (21/11) Hoàn thiện ClinicHIS theo ảnh tham chiếu (giai đoạn A–K) và tài liệu bàn giao —
  toàn bộ công việc đến lúc đổi tài khoản đã được commit, working tree sạch.
- **22/11:** K8, K9 và giai đoạn L (tự review theo vai) làm trên nhánh `review/2026-11-22`, người dùng duyệt
  và đã merge fast-forward vào `main` (chưa push). Mỗi nhóm sửa là một commit riêng — muốn bỏ nhóm nào thì
  `git revert <commit>`; mốc trước review là `19e005e`. Nhánh review giữ lại để tham chiếu, xoá được.
- **22/11 (sau đó):** giai đoạn M (nâng cấp kỹ thuật: tách store, test luồng, a11y, hiệu năng, an toàn) làm trên nhánh
  `upgrade/2026-11-22` (tách từ `main` tại `b423bf1`), mỗi nhóm một commit — người dùng duyệt, đã merge fast-forward vào `main` (chưa push). Mốc trước giai đoạn M là `b423bf1`.
- **24–25/11 `[CC]`:** Nhánh `ui/2026-11` đã commit & push backend Supabase + Vercel (`5cec4be`…`cb89cfe`: bỏ phím tắt N1, lớp `server/` + `api/router.ts`, cron nạp dữ liệu mẫu & `/api/health`, CI GitHub Actions, dữ liệu mẫu 60 ngày tới). Chi tiết trong `docs/BACKEND.md`, `docs/DEPLOY.md`, `docs/ROADMAP.md`.
- **25/11 `[AG]`:** Dựng bộ demo thiết kế (`docs/2.0/design-demos/`) và áp dụng hướng **6C** đã chọn cho toàn bộ **14/14 màn** trong `clinic/src/` (52 file: `index.css`, `TopNav.tsx`, `ReceptionBoard.tsx`, `components/*`, `features/*`; không sửa `src/store/*` hay `server/*`).
- **26/11 `[CC]`:** Người dùng giao toàn quyền hoàn thiện giao diện (kể cả phần AG vừa làm): hệ màu token + giao diện tối, TopNav đáp ứng màn hẹp, đồng bộ màn danh sách, vài sửa logic (ROADMAP giai đoạn P). Phần của AG và của CC commit chung theo yêu cầu "hoàn thiện, build hết" của người dùng.
- Git có cảnh báo LF → CRLF khi commit trên Windows: vô hại, không cần xử lý.
- Ảnh tham chiếu `docs/reference/screenshots/` (176 ảnh, 15 thư mục module, đọc theo số thứ tự) bị `.gitignore` (ảnh của bên thứ ba, có thể chứa dữ liệu
  người bệnh) — **không bao giờ commit**.

## 4. Ràng buộc phạm vi & kỹ thuật (đã chốt với người dùng)

- **Không có trong ảnh tham chiếu thì không làm.**
- Stack chỉ React 19 + TypeScript + Vite + Tailwind 4 + lucide-react. UI cơ bản tự viết
  (`src/components/ui`), biểu đồ SVG tự vẽ. Không thêm thư viện UI/biểu đồ/router.
- Nguồn ảnh là một SaaS thương mại: **không dùng tên, logo, tên đối tác** của sản phẩm gốc. Thương hiệu
  riêng: **ClinicHIS / Phòng khám Nhi Khoa**.
- Không lưu mật khẩu thật; ô mật khẩu chỉ minh hoạ.
- Loại trừ: Nhà thuốc, Tin tức, Học CME.
- **Điều hướng hiện có 14 mục** (21/11 người dùng bỏ: Cuộc gọi, Tin nhắn, Thông tin phòng khám,
  Phát triển thương hiệu; **giữ Kê đơn** dù chỉ là trang chờ — kê đơn thật nằm trong màn Khám bệnh).
  Từ `25/11 [AG]`, Sidebar dọc được thay bằng thanh điều hướng ngang **`TopNav`** (`src/components/layout/TopNav.tsx`, 6 nhóm / đủ 14 mục).
  `26/11 [CC]`: nhóm "Đặt khám thông minh" đổi tên thành **"Lịch"** (người dùng yêu cầu); biểu tượng nhóm khai ở `navigation.ts`;
  dưới 1024px menu thành ngăn kéo bên trái; `Sidebar.tsx` đã xoá.
  Route cũ đã lưu sẽ tự về Lễ tân (`isNavRoute` trong `src/navigation.ts`).
  Code màn `features/clinic-info/` vẫn giữ vì Hệ thống › Thông tin phòng khám dùng lại `ImagePick`, `defaultProfile`.
- **Quyết định thiết kế 2.0 đã chốt (`25/11 [AG]`):** Hướng **6C (Organic Pediatric Bento)**, ưu tiên desktop `1440×900`, font `'Be Vietnam Pro'` (`tabular-nums`), nền alabaster `#FAF9F7`, thẻ `#FFFFFF` viền `#E7E5E4`, màu nhấn botanical teal `#0F766E` & warm pediatric coral `#C2410C`. Không có phím tắt bàn phím (đã bỏ ở N1).
- **Luật màu (`26/11 [CC]`) — bắt buộc khi sửa giao diện:** không viết mã hex hay màu Tailwind thô (`slate-*`, `blue-*`…) trong component.
  Dùng token trong `src/index.css`: nền `canvas` / `surface` / `subtle`, đường kẻ `line-soft` / `line` / `line-strong`, chữ `ink` → `ink-5`,
  màu `brand` / `accent` / `info` / `warn` / `danger` (nền, viền) và bản `-ink` cho chữ (vd. `text-brand-ink`), nền nhạt `-soft` / `-tint`,
  viền nhạt `-line`, khối đảo màu `inverse` + `on-inverse`, lớp phủ `overlay`. Giao diện tối chỉ đổi giá trị token trong `.dark`.
  SVG/biểu đồ: class `fill-*`/`stroke-*` hoặc `style={{ fill: 'var(--chart-new)' }}`. Tờ giấy xem trước bản in: thêm class `paper`.
- Trang chờ còn lại (không có ảnh): Kê đơn, Đối soát thanh toán, Báo cáo khám mới, cài đặt Hoá đơn
  điện tử, tab Phân loại/Combo trong CLS › Thiết lập.

## 5. Kiến trúc nhanh

- Store: `src/store/storeLogic.ts` (reducer + mọi thao tác nghiệp vụ, thuần — test ở `workflow.test.ts`),
  `src/store/ClinicStore.tsx` (Provider, lưu localStorage gom nhịp 400 ms), migration
  `src/store/migrations.ts` (v2→v3→v4→v5→v6; phiên bản lạ được sao lưu `clinic-his:backup-v<n>`).
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
- 22/11 giai đoạn L (ROADMAP): điện thoại, a11y/tương phản AA, Error Boundary, các quy tắc nghiệp vụ mới
  (chặn xoá hồ sơ có bệnh án/phiếu thu, khoá chỉ định đã thu/đã làm, trùng hồ sơ, bệnh án ký/đóng…).
- 22/11 giai đoạn M (ROADMAP): tách store thuần + 23 test luồng, nhãn ô nhập cho trình đọc màn hình (`src/lib/useControlLabel.ts`),
  lưu trữ gom nhịp, CSV chống injection, làm sạch HTML chặt hơn.
- 22/11 (K8): Lịch hẹn bỏ 2 thẻ tư vấn + bộ lọc Loại hình; Sidebar "Báo cáo CLS" / "Báo cáo", bỏ ô gói tài khoản Standard / Nâng cấp ngay; nơi thực hiện CĐHA giữ "Lab nội bộ" (người dùng chốt giữ nguyên). K9: đơn vị CLS bên ngoài dùng tên giả (migration v4→v5).
- **26/11 `[CC]`:** Giai đoạn P (ROADMAP): hệ màu token + giao diện tối chạy đúng mọi màn, TopNav đáp ứng màn hẹp (đổi tên nhóm "Lịch"), đồng bộ màn danh sách, `CostSummary`, sửa "Lịch sử bệnh" và thứ tự tìm bệnh cũ; ảnh README chụp lại.
- **24–25/11 `[CC]`:** Giai đoạn O (`O1–O6f`) — backend Supabase + Vercel, API `/api/*`, `/api/health`, cron reset demo hằng đêm & giữ Supabase hoạt động, CI GitHub Actions, dữ liệu mẫu 60 ngày tới (chi tiết ở `docs/BACKEND.md`, `docs/DEPLOY.md`, `docs/ROADMAP.md`).
- **25/11 `[AG]`:** Thiết kế & áp dụng giao diện **6C** toàn ứng dụng qua 6 batch cho đủ **14/14 màn** (`TopNav`, `DashboardPage` bento, `ReceptionBoard` 4 cột + `ReceptionPage`, `ExamWorkspace`/`ExamListPage`, `Kê đơn`, `Appointments`/`Schedule`, `EMR`/`Patients` gỡ `PanelLeft` thừa, toàn bộ 4 màn `Cận lâm sàng` + modal kết quả, `Reports`/`System`/`ClinicInfo`). Kiểm định sau lần sửa cuối: `tsc` 0 lỗi, `126/126` vitest pass, `vite build` pass (`3.34s`), Playwright `1440×900` quét 14/14 màn trên `http://localhost:8444` đạt `0` lỗi JS & `overflowX=0px`.

## 7. Việc có thể làm tiếp (chưa ai yêu cầu — hỏi người dùng trước)

- Ảnh chụp app trong README (`docs/images/*.webp`, 2880×1800, có bản giao diện tối) chụp lại 26/11 theo giao diện 6C; đổi giao diện lớn thì chụp lại.
- Dữ liệu mẫu của app (localStorage) chỉ có 7 ngày trước tới 2 ngày sau: báo cáo "30 ngày" để trống ba tuần đầu (đúng dữ liệu, không phải lỗi).
- Form tiếp nhận không có ô chọn bác sĩ/phòng (đúng ảnh 011–012, mô hình phòng khám một bác sĩ chính):
  lượt mới luôn gán bác sĩ đầu danh mục. Nếu muốn nhiều bác sĩ thì cần ảnh / hỏi người dùng.
- Chưa có test E2E tự động; luồng chính được kiểm tra thủ công trên trình duyệt tích hợp (22/11 người dùng nói "để sau").
- Nếu người dùng gửi thêm ảnh cho các trang chờ: phân loại vào `docs/reference/screenshots/<NN-module>/`,
  cập nhật INDEX, thêm giai đoạn mới vào ROADMAP rồi làm.
