-- Bucket privado para documentos de usuario
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

-- Tabla de documentos
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  size        bigint,
  mime_type   text,
  storage_path text not null,
  created_at  timestamptz not null default now()
);

-- Tabla de compartidos
create table if not exists public.document_shares (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.documents(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  unique (document_id, shared_with_user_id)
);

-- RLS documents
alter table public.documents enable row level security;

create policy "documents_select"
  on public.documents for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares
      where document_id = documents.id
        and shared_with_user_id = auth.uid()
    )
  );

create policy "documents_insert"
  on public.documents for insert to authenticated
  with check (owner_id = auth.uid());

create policy "documents_delete"
  on public.documents for delete to authenticated
  using (owner_id = auth.uid());

-- RLS document_shares
alter table public.document_shares enable row level security;

create policy "document_shares_select"
  on public.document_shares for select to authenticated
  using (
    shared_with_user_id = auth.uid()
    or exists (
      select 1 from public.documents
      where id = document_shares.document_id
        and owner_id = auth.uid()
    )
  );

create policy "document_shares_insert"
  on public.document_shares for insert to authenticated
  with check (
    exists (
      select 1 from public.documents
      where id = document_shares.document_id
        and owner_id = auth.uid()
    )
  );

create policy "document_shares_delete"
  on public.document_shares for delete to authenticated
  using (
    exists (
      select 1 from public.documents
      where id = document_shares.document_id
        and owner_id = auth.uid()
    )
  );

-- Storage RLS: el dueño puede subir/leer/borrar en su carpeta
-- Otros usuarios acceden mediante URLs firmadas generadas server-side
create policy "storage_documents_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_documents_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.documents d
        join public.document_shares s on s.document_id = d.id
        where d.storage_path = name
          and s.shared_with_user_id = auth.uid()
      )
    )
  );

create policy "storage_documents_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
