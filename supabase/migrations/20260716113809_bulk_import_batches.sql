-- Durable audit trail for CSV/XLSX QR imports. Import batches are not folders:
-- folder_id points at the normal operational folder selected by the user.
create table public.qr_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  folder_id uuid references public.qr_folders(id) on delete set null,
  style_id uuid references public.qr_styles(id) on delete set null,
  name text not null,
  source_file_name text,
  source_format text not null,
  qr_mode text not null default 'dynamic',
  status text not null default 'ready',
  idempotency_key_hash text not null,
  payload_hash text not null,
  total_rows integer not null,
  valid_rows integer not null,
  created_rows integer not null default 0,
  failed_rows integer not null default 0,
  skipped_rows integer not null default 0,
  current_row integer not null default 0,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_import_batches_name_length check (char_length(name) between 1 and 160),
  constraint qr_import_batches_source_file_name_length check (source_file_name is null or char_length(source_file_name) <= 255),
  constraint qr_import_batches_source_format_check check (source_format in ('csv', 'xlsx')),
  constraint qr_import_batches_qr_mode_check check (qr_mode in ('static', 'dynamic')),
  constraint qr_import_batches_status_check check (status in ('ready', 'processing', 'partial', 'completed', 'failed', 'cancelled')),
  constraint qr_import_batches_row_counts_check check (
    total_rows > 0
    and valid_rows between 0 and total_rows
    and created_rows >= 0
    and failed_rows >= 0
    and skipped_rows >= 0
    and current_row >= 0
    and created_rows + failed_rows + skipped_rows <= total_rows
  ),
  constraint qr_import_batches_user_idempotency_unique unique (user_id, idempotency_key_hash),
  constraint qr_import_batches_id_user_unique unique (id, user_id)
);

create table public.qr_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  row_number integer not null,
  input_payload jsonb not null,
  normalized_payload jsonb not null,
  payload_hash text not null,
  status text not null default 'pending',
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  last_retry_run_id uuid,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_import_rows_batch_owner_fk
    foreign key (batch_id, user_id)
    references public.qr_import_batches(id, user_id)
    on delete cascade,
  constraint qr_import_rows_row_number_check check (row_number > 0),
  constraint qr_import_rows_status_check check (status in ('pending', 'processing', 'created', 'failed', 'skipped')),
  constraint qr_import_rows_attempt_count_check check (attempt_count >= 0),
  constraint qr_import_rows_batch_row_unique unique (batch_id, row_number),
  constraint qr_import_rows_qr_code_unique unique (qr_code_id)
);

create index qr_import_batches_user_created_idx
  on public.qr_import_batches (user_id, created_at desc);

create index qr_import_batches_user_status_idx
  on public.qr_import_batches (user_id, status, updated_at desc);

create index qr_import_batches_organization_idx
  on public.qr_import_batches (organization_id)
  where organization_id is not null;

create index qr_import_batches_folder_idx
  on public.qr_import_batches (folder_id)
  where folder_id is not null;

create index qr_import_rows_user_batch_idx
  on public.qr_import_rows (user_id, batch_id, row_number);

create index qr_import_rows_batch_status_idx
  on public.qr_import_rows (batch_id, status, row_number);

alter table public.qr_import_batches enable row level security;
alter table public.qr_import_rows enable row level security;

revoke all on public.qr_import_batches from anon, authenticated;
revoke all on public.qr_import_rows from anon, authenticated;
grant select on public.qr_import_batches to authenticated;
grant select on public.qr_import_rows to authenticated;
grant select, insert, update, delete on public.qr_import_batches to service_role;
grant select, insert, update, delete on public.qr_import_rows to service_role;

create policy "Users can view their own QR import batches"
  on public.qr_import_batches
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own QR import rows"
  on public.qr_import_rows
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Claims a small group of rows in one short transaction. SKIP LOCKED keeps
-- concurrent process requests from ever receiving the same import row.
create or replace function public.claim_qr_import_rows(
  p_batch_id uuid,
  p_user_id uuid,
  p_limit integer default 25,
  p_retry_failed boolean default false,
  p_retry_run_id uuid default null
)
returns table (
  id uuid,
  row_number integer,
  normalized_payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'claim limit must be between 1 and 50';
  end if;

  if p_retry_failed and p_retry_run_id is null then
    raise exception 'retry run id is required when retrying failed rows';
  end if;

  if not exists (
    select 1
    from public.qr_import_batches batches
    where batches.id = p_batch_id
      and batches.user_id = p_user_id
      and batches.status <> 'cancelled'
  ) then
    return;
  end if;

  update public.qr_import_batches batches
  set status = 'processing',
      started_at = coalesce(batches.started_at, now()),
      finished_at = null,
      last_error = null,
      updated_at = now()
  where batches.id = p_batch_id
    and batches.user_id = p_user_id;

  return query
  with candidates as (
    select rows.id
    from public.qr_import_rows rows
    where rows.batch_id = p_batch_id
      and rows.user_id = p_user_id
      and (
        rows.status = 'pending'
        or (
          p_retry_failed
          and rows.status = 'failed'
          and rows.last_retry_run_id is distinct from p_retry_run_id
        )
        or (rows.status = 'processing' and rows.last_attempt_at < now() - interval '5 minutes')
      )
    order by rows.row_number
    for update skip locked
    limit p_limit
  )
  update public.qr_import_rows rows
  set status = 'processing',
      attempt_count = rows.attempt_count + 1,
      last_attempt_at = now(),
      error_code = null,
      error_message = null,
      last_retry_run_id = case
        when p_retry_failed then p_retry_run_id
        else rows.last_retry_run_id
      end,
      updated_at = now()
  from candidates
  where rows.id = candidates.id
  returning rows.id, rows.row_number, rows.normalized_payload;
end;
$$;

revoke all on function public.claim_qr_import_rows(uuid, uuid, integer, boolean, uuid) from public, anon, authenticated;
grant execute on function public.claim_qr_import_rows(uuid, uuid, integer, boolean, uuid) to service_role;
