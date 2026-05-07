-- Permite que cualquier usuario autenticado (no solo admins) cree tareas.
-- La política previa restringía INSERT a admins, lo que rompía el flujo de
-- /tareas/nueva para roles 'usuario'. La acción del servidor ya fija
-- created_by = auth.uid(), así que basta con exigir esa coincidencia.

alter table public.tasks enable row level security;

-- Elimina cualquier política de INSERT existente sobre public.tasks
-- (no conocemos su nombre exacto y puede haber más de una).
do $$
declare
  pol record;
begin
  for pol in
    select polname
    from pg_policy
    where polrelid = 'public.tasks'::regclass
      and polcmd = 'a' -- 'a' = INSERT
  loop
    execute format('drop policy %I on public.tasks', pol.polname);
  end loop;
end$$;

create policy "tasks_insert_authenticated"
  on public.tasks for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = created_by
  );
