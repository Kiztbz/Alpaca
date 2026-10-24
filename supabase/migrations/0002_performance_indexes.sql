begin;

-- Session lookup uses JSON containment on every authenticated request.
create index if not exists users_tokens_gin_idx
  on public.users using gin (tokens jsonb_path_ops);

-- Permission checks use JSON containment when resources are private or shared.
create index if not exists resource_permissions_read_gin_idx
  on public.resource_permissions using gin (read jsonb_path_ops);
create index if not exists resource_permissions_write_gin_idx
  on public.resource_permissions using gin (write jsonb_path_ops);

-- Relationship screens traverse either side by resource type and id.
create index if not exists resource_relations_a_type_id_idx
  on public.resource_relations (a_type, a);
create index if not exists resource_relations_b_type_id_idx
  on public.resource_relations (b_type, b);

-- Library pages paginate and sort by creation time.
create index if not exists sources_created_at_idx on public.sources (created_at desc);
create index if not exists notes_created_at_idx on public.notes (created_at desc);
create index if not exists quizzes_created_at_idx on public.quizzes (created_at desc);
create index if not exists courses_created_at_idx on public.courses (created_at desc);

commit;
