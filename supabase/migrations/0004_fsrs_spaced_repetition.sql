-- 0004_fsrs_spaced_repetition.sql
-- Add FSRS (Free Spaced Repetition Scheduler) v5 columns and indexes to user_quizzes

alter table public.user_quizzes
  add column if not exists state smallint not null default 0,
  add column if not exists difficulty double precision not null default 0,
  add column if not exists stability double precision not null default 0,
  add column if not exists reps integer not null default 0,
  add column if not exists lapses integer not null default 0,
  add column if not exists scheduled_days integer not null default 0,
  add column if not exists last_review timestamptz default now();

-- Migrate existing level-based data to FSRS initial values
update public.user_quizzes
set
  state = case when level > 0 then 2 else 0 end,
  difficulty = case when level > 0 then greatest(1.0, least(10.0, 10.0 - level)) else 0.0 end,
  stability = case when level > 0 then greatest(0.1, level * 1.5) else 0.0 end,
  reps = case when level > 0 then level else 0 end,
  lapses = 0,
  scheduled_days = level,
  last_review = coalesce(last_correct, now())
where state = 0 and level > 0;

create index if not exists user_quizzes_hidden_until_idx on public.user_quizzes(user_id, hidden_until);
create index if not exists user_quizzes_state_idx on public.user_quizzes(user_id, state);
