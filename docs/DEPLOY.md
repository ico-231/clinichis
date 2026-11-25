# Đưa ClinicHIS lên Supabase + Vercel

## Trạng thái (24/11/2026, `[CC]`)

- Supabase: project `clinichis` (Singapore, ref `wkujystomujlbfvwjrec`), đã chạy migration.
- GitHub: repo riêng tư `ico-231/clinichis`, nhánh `ui/2026-11` (Vercel coi là nhánh production — push là tự triển khai).
- Vercel: project `clinichis` (team ICO), địa chỉ `https://clinichis-ico18.vercel.app`, hàm chạy ở Singapore (`sin1`).
  Biến: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (người dùng tự dán, dùng **Secret key mới `sb_secret_...`**), `CLINIC_API_KEY`,
  `VITE_CLINIC_API_KEY`, `ALLOW_SEED=no` (đặt `yes` + triển khai lại nếu cần nạp lại dữ liệu mẫu).
- Dữ liệu mẫu đã nạp 24/11: 41 người bệnh, 98 lượt khám, 70 phiếu thu/hoàn. Đã thử trên bản thật: đọc, tìm không dấu,
  báo cáo, danh mục, tạo + xoá hồ sơ, kiểm tra dữ liệu (422), thiếu khoá (401), API lạ (404), seed đã tắt (404).
- **Dữ liệu 60 ngày tới (25/11):** Supabase có 7 ngày trước → 60 ngày tới. Ngày tới nào cũng tạo như một ngày đang làm việc
  (18 lượt: đã khám, đang khám, chờ, hẹn, huỷ) để hôm nào mở ra cũng có dữ liệu; mỗi ngày một bộ khác nhau (`buildDemoData` trong
  `server/seed.ts`). Đánh đổi đã chốt: xem trước ngày tới sẽ thấy ca "đã khám", báo cáo tính cả doanh thu ngày chưa tới.
  Hết 60 ngày thì nạp lại: `ALLOW_SEED=yes` → triển khai lại → `POST /api/admin/seed` (giờ là **xoá hết rồi nạp lại**) → `ALLOW_SEED=no`.
- **Tự làm mới mỗi đêm (25/11, chưa bật — người dùng chưa đặt `CRON_SECRET`):** `vercel.json → crons` gọi `GET /api/admin/reset-demo` lúc 17:00 UTC (≈ 0h–1h sáng giờ VN,
  gói Hobby chạy lệch trong vòng một giờ). API gọi hàm SQL `reset_demo_data` (migration 0003: xoá lượt khám, người bệnh, bộ đếm,
  danh mục, cài đặt; giữ `logs`) rồi nạp lại dữ liệu demo **theo giờ VN** (7 ngày trước → 60 ngày tới);
  dữ liệu người xem tự nhập bị xoá. Cần biến **`CRON_SECRET`** trên Vercel (người dùng tự đặt; Vercel tự gửi
  `Authorization: Bearer <CRON_SECRET>`). Không đặt hoặc sai mã ⇒ API trả 404. Xem lần chạy: Vercel → project → Settings → Cron Jobs.
- App 1.0 trên web **vẫn dùng localStorage**, chưa gọi API (để dành cho giao diện 2.0).
- Cảnh báo "CLINIC_API_KEY looks like a secret" trên Vercel: bỏ qua được — mã này cố ý nằm cả trong frontend (`VITE_CLINIC_API_KEY`),
  chỉ để chặn người lạ gọi bừa, không phải bí mật thật.
- Vercel Authentication: chỉ còn bảo vệ bản **preview**; bản production công khai (người dùng đồng ý 24/11).
- Gói Hobby chỉ cho 12 hàm ⇒ toàn bộ API đi qua **một** hàm `api/router.ts` (handler nằm ở `server/routes/`).
  Code máy chủ chạy Node ESM trên Vercel ⇒ **import tương đối phải có đuôi `.js`** (kể cả file trong `src/store` mà server dùng).

Ước chừng 15–20 phút, đều dùng được gói miễn phí.

## 1. Supabase (cơ sở dữ liệu)

1. Vào <https://supabase.com> → **New project**. Chọn vùng gần Việt Nam (Singapore), đặt mật khẩu database (tự giữ).
2. Mở **SQL Editor** → chạy lần lượt `supabase/migrations/0001_init.sql`, `0002_audit_fixes.sql`, `0003_reset_demo.sql` → **Run**.
   (Project `clinichis` đã chạy cả ba: `init_clinichis` 24/11, `audit_fixes` và `reset_demo` 25/11.)
   Tạo các bảng `patients`, `visits`, `catalog`, `settings`, `logs`, `counters` và các hàm `create_patient`, `bump_counter`, `replace_catalog`.
3. Vào **Project Settings → API**, lấy:
   - `Project URL` → dùng cho `SUPABASE_URL`
   - **Secret key** mới (`sb_secret_...`) → dùng cho `SUPABASE_SERVICE_ROLE_KEY` (**bí mật**, không dán vào chat, không commit).
     Khoá `service_role` JWT cũ (tab Legacy) vẫn chạy nhưng Supabase sẽ bỏ đầu 2027; code tự nhận loại khoá.

## 2. Nạp dữ liệu mẫu (tuỳ chọn, để bản demo có sẵn người bệnh/lượt khám)

Chạy trong thư mục `clinic/` (PowerShell):

```powershell
$env:SUPABASE_URL='https://<project-ref>.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='<service_role>'; $env:SEED_CONFIRM='yes'; npx vitest run --config scripts/vitest.config.ts
```

Không đặt `SEED_CONFIRM=yes` thì script chỉ đếm, không ghi. Script này chỉ nạp dữ liệu mẫu gốc (7 ngày trước → 2 ngày tới, ghi đè theo id); muốn đủ 60 ngày tới thì dùng cách dưới.

**Cách khác, không cần khoá ở máy** — gọi API trên Vercel sau khi triển khai:
đặt thêm biến `ALLOW_SEED=yes` trên Vercel, triển khai lại, rồi gửi `POST /api/admin/seed` kèm header `x-clinic-key: <CLINIC_API_KEY>` — xoá hết dữ liệu rồi nạp lại 7 ngày trước → 60 ngày tới.
Không bật `ALLOW_SEED` hoặc chưa đặt `CLINIC_API_KEY` thì API này trả 404. Nạp xong **xoá `ALLOW_SEED`**.

## 3. Vercel (web + API)

1. Đưa repo `clinic/` lên GitHub (hiện chưa có remote — người dùng quyết định khi nào push).
2. Vào <https://vercel.com> → **Add New → Project** → chọn repo. **Root Directory**: thư mục chứa `vercel.json` (`clinic` nếu repo là cả `portfolio 1`).
   Framework tự nhận Vite; lệnh build `npm run build`, thư mục `dist` (đã ghi trong `vercel.json`).
3. **Settings → Environment Variables** (mẫu ở `env.example`):

   | Biến | Giá trị |
   |---|---|
   | `SUPABASE_URL` | Project URL ở bước 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret key `sb_secret_...` ở bước 1 |
   | `CLINIC_API_KEY` | Một chuỗi tự đặt (vd. 20 ký tự ngẫu nhiên) để khoá API bản demo |
   | `VITE_CLINIC_API_KEY` | Cùng giá trị với `CLINIC_API_KEY` (frontend gửi kèm khi gọi API) |

4. **Deploy**. Kiểm tra nhanh: mở `https://<tên>.vercel.app/api/patients` (không có mã → 401 nếu đã đặt `CLINIC_API_KEY`), và trang chủ hiện app.

## Lưu ý an toàn

- `CLINIC_API_KEY` chỉ chặn người lạ gọi bừa; mã này nằm trong mã nguồn frontend nên **không thay được đăng nhập**.
  Chưa có đăng nhập ⇒ chỉ dùng dữ liệu mẫu giả, không nhập dữ liệu người bệnh thật.
- RLS đã bật và không có policy ⇒ khoá `anon` công khai của Supabase không đọc/ghi được gì; chỉ API trên Vercel (dùng service role) truy cập.
- Giới hạn 120 lần gọi/phút/IP (`CLINIC_RATE_LIMIT`), tính riêng trong từng máy chủ Vercel.

## Chạy API ở máy

`npm run dev` (Vite, cổng 8443) chỉ chạy giao diện, **không** chạy `api/`. Muốn chạy cả API ở máy cần Vercel CLI (`vercel dev`) —
chưa cài (cài thư viện phải ghi bảng việc trước). Logic API đã được kiểm bằng test (`npx vitest run`).
