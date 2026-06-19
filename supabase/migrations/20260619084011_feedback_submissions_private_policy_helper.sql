create schema if not exists private;

create or replace function private.can_submit_feedback_submission(target_qr_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.qr_codes q
    where q.id = target_qr_id
      and q.user_id = target_user_id
      and q.is_active = true
      and (q.qr_type = 'feedback' or coalesce(q.dynamic_content->>'kind', '') = 'feedback')
  );
$$;

revoke all on function private.can_submit_feedback_submission(uuid, uuid) from public;
grant execute on function private.can_submit_feedback_submission(uuid, uuid) to anon, authenticated, service_role;

drop policy if exists public_insert_feedback_submissions on public.feedback_submissions;

create policy public_insert_feedback_submissions
on public.feedback_submissions
for insert
to anon
with check (private.can_submit_feedback_submission(qr_id, user_id));

notify pgrst, 'reload schema';
