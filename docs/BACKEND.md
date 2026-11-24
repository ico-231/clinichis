# Backend ClinicHIS — kế hoạch và cách chạy

Bắt đầu 24/11/2026 (`[CC]`). Người dùng chốt: **Supabase** (Postgres), **chưa làm đăng nhập**, **app 1.0 giữ nguyên localStorage**
cho tới khi giao diện 2.0 (Antigravity đang thiết kế) xong mới nối vào API. Đích triển khai: **Vercel**.

## Kiến trúc

```
clinic/
├── api/router.ts        Vercel Function DUY NHẤT (gói Hobby giới hạn 12 hàm); vercel.json viết lại mọi /api/* về đây
├── server/router.ts     Bảng định tuyến đường dẫn → handler trong server/routes/
├── server/routes/       Handler từng API (chuẩn Web Request/Response) — chỉ đọc request, gọi server/, trả JSON
├── server/              Logic backend thuần TypeScript, test được không cần mạng
│   ├── repo.ts          Giao diện kho dữ liệu (PatientRepo, VisitRepo…)
│   ├── memoryRepo.ts    Kho trong bộ nhớ: dùng cho test và chạy thử khi chưa có Supabase
│   ├── supabaseRepo.ts  Kho thật: gọi REST của Supabase (PostgREST) bằng fetch, không thêm thư viện
│   ├── patients.ts      Nghiệp vụ người bệnh (kiểm tra dữ liệu, cấp mã BN, chặn xoá)
│   └── http.ts          Tiện ích trả JSON, lỗi, đọc body
└── supabase/migrations/ SQL tạo bảng — chạy trên Supabase (SQL editor hoặc Supabase CLI)
```

- **Không thêm thư viện** (luật AGENTS.md): gọi Supabase qua REST bằng `fetch` sẵn có của Node 18+.
- **Dùng lại quy tắc của 1.0** từ `src/store/` (vd. `patientDeleteBlock`, `runtimeCode`), import đường dẫn tương đối để Vercel đóng gói được.
- **Dữ liệu giữ nguyên hình dạng 1.0** (`src/store/types.ts`): cột chính tách riêng để lọc/sắp xếp, phần lồng nhau
  (thanh toán, chỉ định CLS, sinh hiệu, phiếu khám, bệnh án) để dạng `jsonb`. Khi nối UI 2.0, API trả đúng kiểu `Patient`, `Visit`.
- Cấp mã (`BN000123`, số thứ tự trong ngày, mã khám `YMD…`) làm **ở phía máy chủ**, có khoá chống trùng khi hai quầy tạo cùng lúc.

## Biến môi trường (đặt trên Vercel, không commit)

| Tên | Ý nghĩa |
|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Khoá service role — **chỉ dùng phía máy chủ**, không bao giờ đưa xuống trình duyệt |
| `CLINIC_DATA` | `memory` để chạy bằng kho trong bộ nhớ (thử nhanh, không cần Supabase) |
| `CLINIC_API_KEY` / `VITE_CLINIC_API_KEY` | Mã truy cập dùng chung cho bản demo (header `x-clinic-key`); để trống = API mở |
| `CLINIC_RATE_LIMIT` | Số lần gọi tối đa mỗi phút / IP (mặc định 120) |

Hướng dẫn từng bước: [DEPLOY.md](DEPLOY.md). Lớp gọi API cho giao diện 2.0: `src/api/client.ts` (`createApiClient()`).

Chưa có đăng nhập; API khoá tạm bằng mã truy cập chung + giới hạn số lần gọi, chỉ dùng cho bản demo. Trước khi có dữ liệu thật phải làm đăng nhập + RLS.

## Lộ trình

| Bước | Nội dung | Trạng thái |
|---|---|---|
| B1 | Kế hoạch, migration bảng, lớp `server/`, API người bệnh (`/api/patients`), test | xong 24/11 (chưa chạy trên Supabase thật) |
| B2 | Lượt khám: đăng ký (cấp STT/mã), đổi trạng thái theo luồng 1.0, huỷ | xong 24/11 (chưa chạy trên Supabase thật) |
| B3 | Thu tiền: phiếu thu theo dòng, giảm giá, hoá đơn điện tử (dùng `billing.ts`); hoàn tiền đi theo huỷ lượt như 1.0 | xong 24/11 (chưa chạy trên Supabase thật) |
| B4 | Khám bệnh: sinh hiệu, chẩn đoán, đơn thuốc, hoàn thành; chỉ định & kết quả CLS | xong 24/11 (chưa chạy trên Supabase thật) |
| B5 | Danh mục & cài đặt (dịch vụ, CLS, mẫu đơn, lịch làm việc, thông tin phòng khám), báo cáo | xong 24/11 (chưa chạy trên Supabase thật) |
| B6 | Tạo project Supabase, chạy migration, nạp dữ liệu mẫu, cấu hình Vercel (`vercel.json`, biến môi trường) | code sẵn 24/11 (`vercel.json`, `env.example`, script nạp dữ liệu, `docs/DEPLOY.md`); Supabase `clinichis` đã tạo + migration 24/11; API `POST /api/admin/seed` (cần `ALLOW_SEED=yes`); còn GitHub/Vercel |
| B7 | Đăng nhập + phân quyền + RLS (người dùng: để sau) | để sau |

## API đã có

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| GET | `/api/patients?q=&limit=&offset=` | Danh sách / tìm theo tên, mã, SĐT |
| POST | `/api/patients` | Tạo hồ sơ (cấp mã BN) |
| GET | `/api/patients/:id` | Một hồ sơ |
| PATCH | `/api/patients/:id` | Sửa hồ sơ |
| DELETE | `/api/patients/:id` | Xoá (bị chặn nếu đã khám / đã thu tiền — 409) |

| GET | `/api/visits?dateFrom=&dateTo=&status=&paymentStatus=&patientId=&q=` | Danh sách lượt khám kèm hồ sơ (mặc định hôm nay, giờ VN); sắp như 1.0 |
| POST | `/api/visits` | Đăng ký: bệnh cũ `{ patientId, visit, patientPatch? }` hoặc bệnh mới `{ patient, visit }`; cấp STT, mã khám, phiếu thu nếu thu ngay |
| GET | `/api/visits/:id` | Một lượt khám |
| POST | `/api/visits/:id/status` | `{ status }` — chỉ sang bước kế tiếp: Đã đăng ký → Chờ khám → Đang khám → Đã khám (409 nếu nhảy cóc) |
| POST | `/api/visits/:id/cancel` | `{ reason, refund?, refundMethod? }` — huỷ (không huỷ được lượt đã khám xong); hoàn số đã thu nếu `refund` |

| GET | `/api/visits/:id/payments` | Tổng hợp tiền: các dòng (công khám, CLS) kèm đã thu chưa, đã thu, đã giảm, còn lại, các phiếu |
| POST | `/api/visits/:id/payments` | Thu tiền theo dòng `{ items: [{ kind, refId, discount? }], discount?, customerPaid?, method, invoice?, note? }` — trả phiếu thu, tiền thừa |
| PUT | `/api/visits/:id/payments/:paymentId/invoice` | Thông tin / trạng thái hoá đơn điện tử của phiếu (không sửa được khi đã xuất) |

| PUT | `/api/visits/:id/exam` | Lưu khám: `vitals`, `reason`, `symptoms`, `note`, `exam` (hỏi bệnh, dị ứng, chẩn đoán ICD-10, đơn thuốc, lời dặn, hẹn tái khám, ghi chú). Tự tính BMI, số lượng thuốc; tự chuyển Đang khám |
| PUT | `/api/visits/:id/orders` | Thay danh sách chỉ định CLS `{ orders: [{ serviceId, quantity?, instruction? }] }` — giá/tên từ danh mục; khoá chỉ định đã thu / đang làm / có kết quả |
| POST | `/api/visits/:id/orders/send` | Gửi chỉ định chưa gửi tới nơi thực hiện |
| PATCH | `/api/visits/:id/orders/:orderId` | Phòng CLS: `{ performStatus?, result?: { description, conclusion, recommendation, images?, files? } }` |
| POST | `/api/visits/:id/prescription/send` | Gửi đơn thuốc cho người bệnh (mô phỏng, ghi thời điểm) |
| POST | `/api/visits/:id/finish` | Hoàn thành khám: bắt buộc chiều cao + cân nặng; chưa có chẩn đoán thì cần `confirmNoDiagnosis: true`; gửi luôn chỉ định chưa gửi |
| GET | `/api/orders?dateFrom=&dateTo=&category=imaging\|lab&performStatus=&providerId=` | Danh sách việc của phòng CĐHA / Xét nghiệm (chỉ định đã gửi) |

| GET / PUT | `/api/catalog/:kind` | Danh mục. Sửa được: `services`, `cls_services` (lab nội bộ), `paraclinical_combos`, `prescription_templates`, `result_templates` (PUT `{ items }` thay toàn bộ). Chỉ đọc: `drugs`, `providers`, `doctors`, `rooms`, `external_cls`. Chưa lưu thì trả mặc định của 1.0 (`source: "default"`) |
| GET / PUT | `/api/settings/:key` | Cài đặt `clinic_profile`, `system`, `schedules`, `default_provider_id` (PUT `{ data }`); chưa lưu thì trả mặc định của 1.0 |
| GET | `/api/reports/summary?dateFrom=&dateTo=` | Báo cáo kỳ: lượt theo trạng thái, khách mới/cũ, doanh thu theo ngày thu và hình thức, hoàn tiền, giảm giá, còn phải thu, theo ngày, dịch vụ khám / CLS nhiều nhất (tối đa 1 năm) |

Khám bệnh: quy tắc lấy từ màn khám 1.0. Dịch vụ CLS chỉ định được = danh mục đơn vị ngoài (cố định) + lab nội bộ trong `catalog` (`cls_services`).
Tệp kết quả lưu dạng data URL trong jsonb, giới hạn ~2 MB mỗi chỉ định; bản thật nên chuyển sang Supabase Storage.

Thu tiền: **giá lấy từ dữ liệu máy chủ** (client chỉ chọn dòng và giảm giá), chặn thu trùng dòng, giảm giá vượt tiền, tiền mặt khách đưa thiếu,
lượt đã huỷ. Trạng thái thanh toán tính bằng `derivePaymentStatus` của 1.0.

`visit` có các trường như `VisitInput` của 1.0: `date`, `time`, `endTime?`, `serviceId`, `doctorId`, `roomId`, `fee`, `consultationFee?`,
`paraclinicalOrders?`, `category`, `source`, `reason`, `note`, `symptoms?`, `vitals?`, `checkInNow`, `payNow`, `paidAmountNow?`, `payMethod`, `initialStatus?`.
STT, mã khám và mã phiếu thu lấy từ bộ đếm `counters` trong Postgres (hàm `bump_counter`), hai quầy cùng bấm không bị trùng.
Lượt chuyển sang "Đã khám" hiện chưa kiểm tra phần khám của bác sĩ (sinh hiệu, chẩn đoán) — làm ở B4.

Lỗi trả về dạng `{ "error": { "code": "...", "message": "...", "fields"?: {...} } }`.

## Kiểm tra

- `npx vitest run` chạy cả `server/**/*.test.ts`: nghiệp vụ người bệnh trên kho bộ nhớ, handler API với `Request` thật,
  và lớp Supabase với `fetch` giả lập (đúng URL, header, đổi tên cột).
- `npx tsc -b --noEmit` kiểm cả `server/` và `api/`.
- Chưa thử trên Supabase/Vercel thật (B6 cần người dùng tạo project và cho khoá).

