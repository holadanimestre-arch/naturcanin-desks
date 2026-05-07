-- Tres correcciones de RLS para usuarios no-admin, descubiertas tras
-- arreglar tasks_insert_authenticated:
--
-- 1) tasks SELECT por creador: la acción createTask hace
--    .insert(...).select("id").single(); PostgREST aplica la RLS de
--    SELECT al RETURNING. El creador todavía no está en task_assignees
--    cuando se ejecuta ese SELECT, así que la única política de SELECT
--    para usuarios ("Usuario ve sus tareas asignadas") no le da acceso
--    y la acción cree que falló pese a haber insertado la fila.
--
-- 2) tasks UPDATE por asignados: updateTaskState (drag-drop del tablero)
--    va por el cliente del usuario; sin política de UPDATE para no-admin
--    cualquier usuario asignado a la tarea no puede mover la tarjeta.
--
-- 3) files INSERT por asignados: recordFile va por el cliente del
--    usuario; la política de Storage ya permite subir el blob, pero
--    sin política de INSERT en public.files la fila no se registra y
--    el archivo queda huérfano en el bucket.

-- 1) tasks SELECT — creador
create policy "tasks_select_creator"
  on public.tasks for select
  to authenticated
  using (auth.uid() = created_by);

-- 2) tasks UPDATE — asignados
create policy "tasks_update_assignee"
  on public.tasks for update
  to authenticated
  using (
    exists (
      select 1 from public.task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.user_id = auth.uid()
    )
  );

-- 3) files INSERT — asignados a la tarea
create policy "files_insert_assignee"
  on public.files for insert
  to authenticated
  with check (
    exists (
      select 1 from public.task_assignees
      where task_assignees.task_id = files.task_id
        and task_assignees.user_id = auth.uid()
    )
  );
