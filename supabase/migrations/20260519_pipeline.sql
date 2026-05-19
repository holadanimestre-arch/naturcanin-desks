-- ─────────────────────────────────────────────────────────────────────────────
-- Pipeline / CRM feature
-- Apply this in the Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Storage bucket for pipeline card attachments
insert into storage.buckets (id, name, public, file_size_limit)
values ('pipeline-files', 'pipeline-files', false, 52428800)
on conflict (id) do nothing;

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.pipelines (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_columns (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  position    float not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.pipeline_cards (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  column_id   uuid not null references public.pipeline_columns(id) on delete cascade,
  title       text not null,
  notes       text,
  position    float not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.pipeline_card_files (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.pipeline_cards(id) on delete cascade,
  name         text not null,
  size         bigint,
  mime_type    text,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.pipeline_card_comments (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.pipeline_cards(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_card_activity (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.pipeline_cards(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on pipeline_cards
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pipeline_cards_updated_at on public.pipeline_cards;
create trigger pipeline_cards_updated_at
  before update on public.pipeline_cards
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.pipelines              enable row level security;
alter table public.pipeline_columns       enable row level security;
alter table public.pipeline_cards         enable row level security;
alter table public.pipeline_card_files    enable row level security;
alter table public.pipeline_card_comments enable row level security;
alter table public.pipeline_card_activity enable row level security;

-- pipelines — owner only
create policy "pipelines_select" on public.pipelines for select to authenticated
  using (owner_id = auth.uid());
create policy "pipelines_insert" on public.pipelines for insert to authenticated
  with check (owner_id = auth.uid());
create policy "pipelines_update" on public.pipelines for update to authenticated
  using (owner_id = auth.uid());
create policy "pipelines_delete" on public.pipelines for delete to authenticated
  using (owner_id = auth.uid());

-- pipeline_columns — access when pipeline owner
create policy "pipeline_columns_select" on public.pipeline_columns for select to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_columns_insert" on public.pipeline_columns for insert to authenticated
  with check (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_columns_update" on public.pipeline_columns for update to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_columns_delete" on public.pipeline_columns for delete to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));

-- pipeline_cards — access when pipeline owner
create policy "pipeline_cards_select" on public.pipeline_cards for select to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_cards_insert" on public.pipeline_cards for insert to authenticated
  with check (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_cards_update" on public.pipeline_cards for update to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));
create policy "pipeline_cards_delete" on public.pipeline_cards for delete to authenticated
  using (exists (select 1 from public.pipelines p where p.id = pipeline_id and p.owner_id = auth.uid()));

-- pipeline_card_files
create policy "pipeline_card_files_select" on public.pipeline_card_files for select to authenticated
  using (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));
create policy "pipeline_card_files_insert" on public.pipeline_card_files for insert to authenticated
  with check (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));
create policy "pipeline_card_files_delete" on public.pipeline_card_files for delete to authenticated
  using (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));

-- pipeline_card_comments
create policy "pipeline_card_comments_select" on public.pipeline_card_comments for select to authenticated
  using (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));
create policy "pipeline_card_comments_insert" on public.pipeline_card_comments for insert to authenticated
  with check (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));

-- pipeline_card_activity
create policy "pipeline_card_activity_select" on public.pipeline_card_activity for select to authenticated
  using (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));
create policy "pipeline_card_activity_insert" on public.pipeline_card_activity for insert to authenticated
  with check (exists (
    select 1 from public.pipeline_cards c
    join public.pipelines p on p.id = c.pipeline_id
    where c.id = card_id and p.owner_id = auth.uid()
  ));

-- ── Storage RLS ───────────────────────────────────────────────────────────────

create policy "pipeline_files_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pipeline-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pipeline_files_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'pipeline-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pipeline_files_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'pipeline-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
