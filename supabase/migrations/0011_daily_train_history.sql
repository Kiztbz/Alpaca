begin;

create table if not exists public.daily_train_sessions (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  total_questions integer not null check (total_questions between 1 and 5),
  correct_answers integer not null check (correct_answers between 0 and total_questions),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  results jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

create index if not exists daily_train_sessions_user_completed_idx
  on public.daily_train_sessions (user_id, completed_at desc);

create index if not exists daily_train_sessions_course_idx
  on public.daily_train_sessions (course_id);

commit;
