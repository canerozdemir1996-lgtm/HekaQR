alter table public.exam_submissions
  drop constraint if exists exam_submissions_status_check;

alter table public.exam_submissions
  add constraint exam_submissions_status_check
  check (status in ('in_progress', 'submitted', 'needs_review', 'expired', 'blocked'));

alter table public.exam_submissions
  add column if not exists ip_lock_hash text;

create index if not exists exam_submissions_ip_lock_active_idx
  on public.exam_submissions(qr_id, ip_lock_hash, created_at desc)
  where ip_lock_hash is not null and status = 'in_progress';
