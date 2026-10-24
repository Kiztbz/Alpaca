alter table public.associates add primary key (a, b);
alter table public.blocked add primary key (blocker, blocked);
alter table public.resource_relations add primary key (a, b, a_type, b_type);

create index if not exists groups_created_by_idx on public.groups(created_by);
create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id);
create index if not exists notifications_sender_id_idx on public.notifications(sender_id);
create index if not exists notifications_group_id_idx on public.notifications(group_id);
create index if not exists sources_created_by_idx on public.sources(created_by);
create index if not exists notes_created_by_idx on public.notes(created_by);
create index if not exists quizzes_created_by_idx on public.quizzes(created_by);
create index if not exists courses_created_by_idx on public.courses(created_by);
create index if not exists user_reports_reporter_idx on public.user_reports(reporter);
create index if not exists user_reports_reported_idx on public.user_reports(reported);
