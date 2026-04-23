-- Subtareas: lista de sub-items por tarea.
create table if not exists public.subtasks (
  id bigserial primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  text text not null check (length(btrim(text)) > 0),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists subtasks_task_id_idx on public.subtasks(task_id);
create index if not exists subtasks_task_position_idx on public.subtasks(task_id, position);

alter table public.subtasks enable row level security;

-- Cualquier usuario autenticado que pueda ver la tarea padre puede ver sus subtareas.
create policy "subtasks_select_if_task_visible"
  on public.subtasks for select
  to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id)
  );

-- Cualquier autenticado puede añadir subtareas a tareas visibles.
create policy "subtasks_insert_authenticated"
  on public.subtasks for insert
  to authenticated
  with check (
    auth.uid() is not null
    and exists (select 1 from public.tasks t where t.id = subtasks.task_id)
  );

-- Cualquier autenticado puede actualizar subtareas de tareas visibles (por ejemplo marcar done).
create policy "subtasks_update_authenticated"
  on public.subtasks for update
  to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id)
  )
  with check (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id)
  );

-- Cualquier autenticado puede borrar subtareas de tareas visibles.
create policy "subtasks_delete_authenticated"
  on public.subtasks for delete
  to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = subtasks.task_id)
  );
