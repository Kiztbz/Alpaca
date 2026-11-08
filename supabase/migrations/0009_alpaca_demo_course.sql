begin;

do $$
declare
  demo_creator bigint;
  demo_course bigint;
begin
  select id into demo_creator
  from public.users
  order by case when role = 'superadmin' then 0 else 1 end, created_at asc
  limit 1;

  if demo_creator is not null then
    insert into public.courses (public_id, name, description, enrollment, created_by, is_demo, is_deleted)
    values (
      'ALPD01',
      'Alpaca demo',
      'A hands-on preview of lessons, daily practice, course switching, and progress tracking on Alpaca.',
      'open',
      demo_creator,
      true,
      false
    )
    on conflict (public_id) do update set
      name = excluded.name,
      description = excluded.description,
      enrollment = excluded.enrollment,
      is_demo = true,
      is_deleted = false
    returning id into demo_course;

    insert into public.resource_permissions (resource_id, resource_type, all_read, all_write)
    values (demo_course, 'course', true, false)
    on conflict (resource_id, resource_type) do update set all_read = true;

    insert into public.course_users (course_id, user_id, role)
    values (demo_course, demo_creator, 'owner')
    on conflict (course_id, user_id) do update set role = 'owner';
  end if;
end $$;

commit;
