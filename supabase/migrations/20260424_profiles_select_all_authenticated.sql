-- Permite que cualquier usuario autenticado vea los perfiles de sus compañeros.
-- Sin esto, los nombres no resuelven en el chat ni en los avatares porque la
-- RLS anterior solo permitía ver el propio perfil o si eres admin.
create policy "Usuarios ven todos los perfiles"
  on public.profiles for select
  to authenticated using (true);
