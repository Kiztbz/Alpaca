begin;
alter table public.courses add column if not exists is_demo boolean not null default false;
update public.courses set is_demo = true where public_id = 'TCR001' or lower(name) = 'learning fundamentals';
with first_open as (
  select id from public.courses where enrollment = 'open' and is_deleted = false order by created_at asc limit 1
)
update public.courses set is_demo = true where id in (select id from first_open) and not exists (select 1 from public.courses where is_demo = true);
commit;
