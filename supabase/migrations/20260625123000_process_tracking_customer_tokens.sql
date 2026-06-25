alter table public.booking_submissions add column if not exists public_token text;
alter table public.booking_submissions add column if not exists customer_message text;
alter table public.booking_submissions add column if not exists customer_cancelled_at timestamptz;

alter table public.feedback_submissions add column if not exists public_token text;
alter table public.feedback_submissions add column if not exists customer_message text;
alter table public.feedback_submissions add column if not exists customer_cancelled_at timestamptz;

create index if not exists idx_booking_submissions_public_lookup
  on public.booking_submissions(qr_id, public_token, created_at desc)
  where public_token is not null;

create index if not exists idx_booking_submissions_availability
  on public.booking_submissions(qr_id, appointment_date, appointment_time, status);

create index if not exists idx_feedback_submissions_public_lookup
  on public.feedback_submissions(qr_id, public_token, created_at desc)
  where public_token is not null;

create unique index if not exists uniq_active_booking_public_token
  on public.booking_submissions(qr_id, public_token)
  where public_token is not null and status in ('new', 'in_progress');

create unique index if not exists uniq_active_feedback_public_token
  on public.feedback_submissions(qr_id, public_token)
  where public_token is not null and status in ('new', 'in_progress');

notify pgrst, 'reload schema';
