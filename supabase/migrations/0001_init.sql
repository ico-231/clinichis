-- ClinicHIS — khởi tạo cơ sở dữ liệu (Supabase / Postgres)
-- Hình dạng dữ liệu theo src/store/types.ts của 1.0. Phần lồng nhau để jsonb.
-- Chưa có đăng nhập: bật RLS và KHÔNG tạo policy => chỉ khoá service role (dùng ở Vercel Functions) đọc/ghi được.

create table if not exists patients (
  id text primary key,
  code text not null unique,                 -- BN000123
  full_name text not null,
  search_key text not null default '',       -- họ tên bỏ dấu, chữ thường (máy chủ ghi) để tìm "nguyen van an"
  dob date not null,
  gender text not null check (gender in ('male', 'female')),
  phone text not null default '',
  address text not null default '',
  cccd text,
  email text,
  blood_type text,
  occupation text,
  ethnicity text,
  nationality text,
  province text,
  ward text,
  street_address text,
  relative jsonb,
  guardian_name text,
  guardian_relation text,
  insurance_number text,
  allergies text,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists patients_phone_idx on patients (phone);
create index if not exists patients_search_idx on patients (search_key);

create table if not exists visits (
  id text primary key,
  code text not null unique,                 -- YMD202611230000001
  patient_id text not null references patients (id) on delete cascade,
  queue_number int not null,
  date date not null,
  time text not null,                        -- HH:mm
  end_time text,
  doctor_id text not null,
  room_id text not null,
  service_id text not null,
  consultation_fee bigint,
  medication_fee bigint,
  paraclinical_orders jsonb not null default '[]'::jsonb,
  fee bigint not null default 0,
  payments jsonb not null default '[]'::jsonb,
  payment_status text not null,
  status text not null check (status in ('registered', 'waiting', 'in_progress', 'done', 'cancelled')),
  patient_type text not null,
  visit_kind text,
  category text not null,
  source text not null,
  reason text not null default '',
  symptoms text,
  note text not null default '',
  vitals jsonb,
  exam jsonb,
  emr jsonb,
  cancel_reason text,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  unique (date, queue_number)
);
create index if not exists visits_date_idx on visits (date);
create index if not exists visits_patient_idx on visits (patient_id);

-- Danh mục và cài đặt: giữ nguyên dạng 1.0, mỗi mục một dòng jsonb theo khoá
create table if not exists catalog (
  kind text not null,                        -- services | cls_services | paraclinical_combos | prescription_templates | result_templates
  id text not null,
  data jsonb not null,
  primary key (kind, id)
);

create table if not exists settings (
  key text primary key,                      -- clinic_profile | system | schedules | default_provider_id
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists logs (
  id bigserial primary key,
  kind text not null,                        -- emr_access | report_download
  data jsonb not null,
  at timestamptz not null default now()
);

-- Tạo hồ sơ người bệnh và cấp mã BN trong CÙNG một giao dịch (khoá chống trùng khi nhiều quầy tạo cùng lúc).
-- payload: một dòng patients dạng jsonb (snake_case), không cần id/code/created_at.
create or replace function create_patient(payload jsonb) returns patients
language plpgsql as $$
declare n int; r patients;
begin
  perform pg_advisory_xact_lock(hashtext('patients_code'));
  select coalesce(max(nullif(regexp_replace(code, '\D', '', 'g'), '')::int), 0) + 1 into n from patients;
  r := jsonb_populate_record(null::patients, payload);
  r.id := coalesce(r.id, 'p_' || replace(gen_random_uuid()::text, '-', ''));
  r.code := 'BN' || lpad(n::text, 6, '0');
  r.created_at := now();
  r.updated_at := now();
  r.notes := coalesce(r.notes, '[]'::jsonb);
  r.phone := coalesce(r.phone, '');
  r.address := coalesce(r.address, '');
  insert into patients select r.*;
  return r;
end $$;

alter table patients enable row level security;
alter table visits enable row level security;
alter table catalog enable row level security;
alter table settings enable row level security;
alter table logs enable row level security;

-- Bộ đếm dùng chung (số thứ tự trong ngày "queue:2026-11-24", mã phiếu thu "receipt:20261124"…).
-- Tăng và trả về giá trị mới trong một câu lệnh => hai quầy gọi cùng lúc không bao giờ nhận trùng số.
create table if not exists counters (
  key text primary key,
  value int not null
);
alter table counters enable row level security;

create or replace function bump_counter(counter_key text, floor_value int default 0) returns int
language sql as $$
  insert into counters (key, value) values (counter_key, floor_value + 1)
  on conflict (key) do update set value = greatest(counters.value, floor_value) + 1
  returning value;
$$;

-- Thay toàn bộ một loại danh mục trong một giao dịch (danh sách rỗng vẫn được ghi nhận là "đã lưu")
create or replace function replace_catalog(catalog_kind text, items jsonb) returns void
language plpgsql as $$
begin
  delete from catalog where kind = catalog_kind;
  insert into catalog (kind, id, data)
    select catalog_kind, x->>'id', x->'data' from jsonb_array_elements(items) as x;
  insert into settings (key, data) values ('catalog_saved:' || catalog_kind, 'true'::jsonb)
    on conflict (key) do update set updated_at = now();
end $$;
