drop policy if exists tareas_select on public.tareas;
create policy tareas_select on public.tareas for select to authenticated using ((select private.app_role()) = any (array['admin','auditor']));
drop policy if exists registros_select on public.tarea_registros;
create policy registros_select on public.tarea_registros for select to authenticated using ((select private.app_role()) = any (array['admin','auditor']));
