begin;
alter table public.users alter column password_reset type varchar(64);
alter table public.auth_attempts drop constraint if exists auth_attempts_action_check;
alter table public.auth_attempts add constraint auth_attempts_action_check
  check (action in ('login', 'register', 'two_factor', 'password_reset'));
commit;
