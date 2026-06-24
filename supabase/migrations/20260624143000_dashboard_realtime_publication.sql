do $$
begin
  if to_regclass('public.feedback_submissions') is not null
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback_submissions'
     ) then
    alter publication supabase_realtime add table public.feedback_submissions;
  end if;

  if to_regclass('public.booking_submissions') is not null
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_submissions'
     ) then
    alter publication supabase_realtime add table public.booking_submissions;
  end if;

  if to_regclass('public.admin_messages') is not null
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_messages'
     ) then
    alter publication supabase_realtime add table public.admin_messages;
  end if;
end
$$;
