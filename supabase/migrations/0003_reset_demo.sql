-- 0003 (25/11/2026, [CC]) — đặt lại bản demo mỗi đêm
-- Lịch chạy của Vercel gọi /api/admin/reset-demo: hàm này xoá hết dữ liệu trong một giao dịch,
-- rồi API nạp lại dữ liệu mẫu theo ngày hôm nay. Danh mục / cài đặt không có dòng ⇒ API tự dùng mặc định.
-- Bảng logs (nhật ký truy cập) giữ nguyên.

create or replace function reset_demo_data() returns void
language plpgsql
set search_path = public
as $$
begin
  delete from visits where true;
  delete from patients where true;
  delete from counters where true;
  delete from catalog where true;
  delete from settings where true;
end $$;

-- Chỉ service_role (API trên Vercel) gọi được
revoke execute on function reset_demo_data() from public, anon, authenticated;
