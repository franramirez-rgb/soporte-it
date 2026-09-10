-- Performance and RLS optimization applied to the production Supabase project.
create index if not exists idx_usuarios_centro_coste_id on public.usuarios(centro_coste_id);
create index if not exists idx_equipos_centro_coste_id on public.equipos(centro_coste_id);
create index if not exists idx_tareas_centro_coste_id on public.tareas(centro_coste_id);
create index if not exists idx_tareas_incidencia_id on public.tareas(incidencia_id);
create index if not exists idx_mensajes_usuario_id on public.mensajes(usuario_id);
create index if not exists idx_tarea_registros_usuario_id on public.tarea_registros(usuario_id);
create index if not exists idx_incidencias_active_fecha on public.incidencias(fecha_creacion desc) where eliminado = false;
drop index if exists public.idx_incidencias_fecha;

alter table if exists private.usuario_credenciales enable row level security;

drop policy if exists centros_write_admin on public.centros_coste;
create policy centros_insert_admin on public.centros_coste for insert to authenticated with check ((select private.app_role()) = 'admin');
create policy centros_update_admin on public.centros_coste for update to authenticated using ((select private.app_role()) = 'admin') with check ((select private.app_role()) = 'admin');
create policy centros_delete_admin on public.centros_coste for delete to authenticated using ((select private.app_role()) = 'admin');

drop policy if exists equipos_write on public.equipos;
create policy equipos_insert_staff on public.equipos for insert to authenticated with check ((select private.app_role()) = any (array['admin','controller']));
create policy equipos_update_staff on public.equipos for update to authenticated using ((select private.app_role()) = any (array['admin','controller'])) with check ((select private.app_role()) = any (array['admin','controller']));
create policy equipos_delete_staff on public.equipos for delete to authenticated using ((select private.app_role()) = any (array['admin','controller']));

drop policy if exists tareas_write_admin on public.tareas;
create policy tareas_insert_admin on public.tareas for insert to authenticated with check ((select private.app_role()) = 'admin');
create policy tareas_update_admin on public.tareas for update to authenticated using ((select private.app_role()) = 'admin') with check ((select private.app_role()) = 'admin');
create policy tareas_delete_admin on public.tareas for delete to authenticated using ((select private.app_role()) = 'admin');

drop policy if exists registros_write_admin on public.tarea_registros;
create policy registros_insert_admin on public.tarea_registros for insert to authenticated with check ((select private.app_role()) = 'admin');
create policy registros_update_admin on public.tarea_registros for update to authenticated using ((select private.app_role()) = 'admin') with check ((select private.app_role()) = 'admin');
create policy registros_delete_admin on public.tarea_registros for delete to authenticated using ((select private.app_role()) = 'admin');

drop policy if exists usuarios_select_self on public.usuarios;
create policy usuarios_select_self on public.usuarios for select to authenticated using ((auth_user_id = (select auth.uid())) or (select private.app_role()) = any (array['admin','controller','auditor']));
drop policy if exists usuarios_admin_insert on public.usuarios;
create policy usuarios_admin_insert on public.usuarios for insert to authenticated with check ((select private.app_role()) = 'admin');
drop policy if exists usuarios_admin_delete on public.usuarios;
create policy usuarios_admin_delete on public.usuarios for delete to authenticated using (((select private.app_role()) = 'admin') and (auth_user_id <> (select auth.uid())));
drop policy if exists usuarios_update_self on public.usuarios;
create policy usuarios_update_self on public.usuarios for update to authenticated using ((auth_user_id = (select auth.uid())) or (select private.app_role()) = 'admin') with check ((auth_user_id = (select auth.uid())) or (select private.app_role()) = 'admin');

drop policy if exists equipos_select on public.equipos;
create policy equipos_select on public.equipos for select to authenticated using ((usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid()))) or (select private.app_role()) = any (array['admin','controller','auditor']));

drop policy if exists incidencias_insert on public.incidencias;
create policy incidencias_insert on public.incidencias for insert to authenticated with check (usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid())));
drop policy if exists incidencias_select on public.incidencias;
create policy incidencias_select on public.incidencias for select to authenticated using ((usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid()))) or (select private.app_role()) = any (array['admin','auditor']));
drop policy if exists incidencias_update_admin on public.incidencias;
create policy incidencias_update_admin on public.incidencias for update to authenticated using ((select private.app_role()) = 'admin') with check ((select private.app_role()) = 'admin');
drop policy if exists incidencias_delete_admin on public.incidencias;
create policy incidencias_delete_admin on public.incidencias for delete to authenticated using ((select private.app_role()) = 'admin');

drop policy if exists mensajes_select on public.mensajes;
create policy mensajes_select on public.mensajes for select to authenticated using ((usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid()))) or (incidencia_id in (select i.id from public.incidencias i where i.usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid())))) or (select private.app_role()) = any (array['admin','controller','auditor']));
drop policy if exists mensajes_insert on public.mensajes;
create policy mensajes_insert on public.mensajes for insert to authenticated with check ((usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid()))) and ((incidencia_id in (select i.id from public.incidencias i where i.usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid())))) or (select private.app_role()) = any (array['admin','controller'])));

drop policy if exists notificaciones_select_own on public.notificaciones;
create policy notificaciones_select_own on public.notificaciones for select to authenticated using (usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid())));
drop policy if exists notificaciones_update_own on public.notificaciones;
create policy notificaciones_update_own on public.notificaciones for update to authenticated using (usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid()))) with check (usuario_id = (select id from public.usuarios where auth_user_id = (select auth.uid())));

drop policy if exists email_logs_select_staff on public.email_logs;
create policy email_logs_select_staff on public.email_logs for select to authenticated using ((select private.app_role()) = any (array['admin','auditor']));
