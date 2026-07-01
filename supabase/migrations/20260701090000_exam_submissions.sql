create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant jsonb not null default '{}'::jsonb,
  access_code text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  time_used_seconds integer not null default 0 check (time_used_seconds >= 0),
  score numeric not null default 0,
  max_score numeric not null default 0,
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  blank_count integer not null default 0 check (blank_count >= 0),
  passed boolean not null default false,
  status text not null default 'submitted' check (status in ('in_progress', 'submitted', 'expired', 'blocked')),
  attempt_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.exam_submissions(id) on delete cascade,
  question_id text not null,
  answer jsonb,
  correct_answer jsonb,
  is_correct boolean not null default false,
  points numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists exam_submissions_qr_created_idx on public.exam_submissions(qr_id, created_at desc);
create index if not exists exam_submissions_user_created_idx on public.exam_submissions(user_id, created_at desc);
create index if not exists exam_submissions_fingerprint_idx on public.exam_submissions(qr_id, attempt_fingerprint) where attempt_fingerprint is not null;
create index if not exists exam_submissions_access_code_idx on public.exam_submissions(qr_id, access_code) where access_code is not null;
create index if not exists exam_answers_submission_idx on public.exam_answers(submission_id);

alter table public.exam_submissions enable row level security;
alter table public.exam_answers enable row level security;

drop policy if exists exam_submissions_owner_select on public.exam_submissions;
create policy exam_submissions_owner_select on public.exam_submissions
  for select to authenticated
  using (
    exists (
      select 1
      from public.qr_codes q
      where q.id = exam_submissions.qr_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists exam_answers_owner_select on public.exam_answers;
create policy exam_answers_owner_select on public.exam_answers
  for select to authenticated
  using (
    exists (
      select 1
      from public.exam_submissions s
      join public.qr_codes q on q.id = s.qr_id
      where s.id = exam_answers.submission_id
        and q.user_id = auth.uid()
    )
  );

grant select on public.exam_submissions to authenticated;
grant select on public.exam_answers to authenticated;
grant select, insert, update, delete on public.exam_submissions to service_role;
grant select, insert, update, delete on public.exam_answers to service_role;
