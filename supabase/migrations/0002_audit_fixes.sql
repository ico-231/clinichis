-- 0002 (25/11/2026, [CC]) — sửa sau audit
-- 1. Danh mục giữ đúng thứ tự người dùng sắp (trước đây không có cột thứ tự ⇒ PostgREST trả thứ tự bất kỳ)
-- 2. Cố định search_path cho các hàm SQL (cảnh báo bảo mật "function_search_path_mutable" của Supabase)

alter table catalog add column if not exists position int not null default 0;

create or replace function replace_catalog(catalog_kind text, items jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  delete from catalog where kind = catalog_kind;
  insert into catalog (kind, id, data, position)
    select catalog_kind, x->>'id', x->'data', (ord - 1)::int
    from jsonb_array_elements(items) with ordinality as t(x, ord);
  insert into settings (key, data) values ('catalog_saved:' || catalog_kind, 'true'::jsonb)
    on conflict (key) do update set updated_at = now();
end $$;

alter function create_patient(jsonb) set search_path = public;
alter function bump_counter(text, int) set search_path = public;

-- create or replace giữ quyền cũ, nhắc lại cho chắc: chỉ service_role (API trên Vercel) gọi được
revoke execute on function replace_catalog(text, jsonb) from public, anon, authenticated;
