create table if not exists public.app_logs (
  id          bigint generated always as identity primary key,
  level       text    not null default 'error' check (level in ('error', 'warn', 'info')),
  message     text    not null,
  context     jsonb,
  user_id     uuid    references auth.users(id) on delete set null,
  path        text,
  created_at  timestamptz not null default now()
);

create index if not exists app_logs_created_at_idx on public.app_logs(created_at desc);
create index if not exists app_logs_level_idx      on public.app_logs(level);

alter table public.app_logs enable row level security;

-- Solo admins pueden leer
create policy "app_logs_select_admin"
  on public.app_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Service role puede insertar (via createAdminClient)
create policy "app_logs_insert_service"
  on public.app_logs for insert
  to service_role
  with check (true);
