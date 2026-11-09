begin;

alter table public.course_note_progress
  alter column completed_at drop not null;

alter table public.course_note_progress
  add column if not exists last_card_index integer not null default 0,
  add column if not exists total_cards integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.course_note_progress
  drop constraint if exists course_note_progress_card_index_check;
alter table public.course_note_progress
  add constraint course_note_progress_card_index_check check (last_card_index >= 0 and total_cards > 0);

update public.course_note_progress
set last_card_index = greatest(total_cards - 1, 0), updated_at = now()
where completed_at is not null;

commit;
