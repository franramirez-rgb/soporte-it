create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.usuarios add column if not exists auth_user_id uuid unique;

create table if not exists public.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  enlace text,
  leida_at timestamptz,
  creada_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id bigint generated always as identity primary key,
  evento text not null,
  destinatario text not null,
  asunto text not null,
  entidad_tipo text,
  entidad_id bigint,
  estado text not null check (estado in ('enviado','fallido')),
  error text,
  creado_at timestamptz not null default now()
);

create table if not exists private.usuario_credenciales (
  usuario_id bigint primary key references public.usuarios(id) on delete cascade,
  password_hash text,
  token_recuperacion text,
  token_expiracion timestamptz,
  token_verificacion text
);

revoke all on schema private from public;
revoke all on table private.usuario_credenciales from public, anon, authenticated;

create index if not exists idx_usuarios_auth_user on public.usuarios(auth_user_id);
create index if not exists idx_incidencias_usuario_estado on public.incidencias(usuario_id, estado, eliminado);
create index if not exists idx_incidencias_fecha on public.incidencias(fecha_creacion desc);
create index if not exists idx_mensajes_incidencia_fecha on public.mensajes(incidencia_id, fecha_creacion);
create index if not exists idx_tareas_estado_centro on public.tareas(estado, centro_coste_id, eliminado);
create index if not exists idx_tarea_registros_tarea_fecha on public.tarea_registros(tarea_id, fecha_creacion);
create index if not exists idx_equipos_usuario_estado on public.equipos(usuario_id, estado_equipo);
create index if not exists idx_notificaciones_usuario_leida on public.notificaciones(usuario_id, leida_at, creada_at desc);
create index if not exists idx_email_logs_evento_fecha on public.email_logs(evento, creado_at desc);

create or replace function private.app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rol from public.usuarios where auth_user_id = auth.uid() limit 1;
$$;
revoke all on function private.app_role() from public;
grant execute on function private.app_role() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.usuarios (auth_user_id, nombre, email, rol, estado_cuenta)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(coalesce(new.email,''),'@',1)),
    new.email,
    'empleado',
    case when new.email_confirmed_at is null then 'no_verificado' else 'pendiente' end
  )
  on conflict (email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

create or replace function private.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.usuarios set email = new.email where auth_user_id = new.id;
  end if;
  if new.email_confirmed_at is not null then
    update public.usuarios set estado_cuenta = case when estado_cuenta = 'no_verificado' then 'pendiente' else estado_cuenta end where auth_user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_auth_user_email() from public;
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users for each row execute function private.sync_auth_user_email();


insert into storage.buckets (id,name,public)
values ('ticket-attachments','ticket-attachments',false)
on conflict (id) do update set public=false;

alter table public.centros_coste enable row level security;
alter table public.usuarios enable row level security;
alter table public.equipos enable row level security;
alter table public.incidencias enable row level security;
alter table public.mensajes enable row level security;
alter table public.tareas enable row level security;
alter table public.tarea_registros enable row level security;
alter table public.notificaciones enable row level security;
alter table public.email_logs enable row level security;
alter table public.notificaciones replica identity full;
alter table public.mensajes replica identity full;
alter table public.incidencias replica identity full;
create table if not exists public.user_roles (auth_user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('admin','controller','empleado','auditor')));
alter table public.user_roles enable row level security;

-- CENTROS
 drop policy if exists centros_select_authenticated on public.centros_coste;
 create policy centros_select_authenticated on public.centros_coste for select to authenticated using (true);
 drop policy if exists centros_admin_write on public.centros_coste;
 create policy centros_admin_write on public.centros_coste for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');

-- USUARIOS: lectura de propio perfil, o administración/auditoría. Solo admin modifica.
 drop policy if exists usuarios_select on public.usuarios;
 create policy usuarios_select on public.usuarios for select to authenticated using (auth_user_id=auth.uid() or private.app_role() in ('admin','controller','auditor'));
 drop policy if exists usuarios_admin_write on public.usuarios;
 create policy usuarios_admin_write on public.usuarios for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');

-- EQUIPOS
 drop policy if exists equipos_select on public.equipos;
 create policy equipos_select on public.equipos for select to authenticated using (usuario_id=(select id from public.usuarios where auth_user_id=auth.uid()) or private.app_role() in ('admin','controller','auditor'));
 drop policy if exists equipos_staff_write on public.equipos;
 create policy equipos_staff_write on public.equipos for all to authenticated using (private.app_role() in ('admin','controller')) with check (private.app_role() in ('admin','controller'));

-- INCIDENCIAS: el cliente puede leer sus tickets; las escrituras se hacen mediante Server Actions.
 drop policy if exists incidencias_select on public.incidencias;
 create policy incidencias_select on public.incidencias for select to authenticated using (usuario_id=(select id from public.usuarios where auth_user_id=auth.uid()) or private.app_role() in ('admin','auditor'));
 drop policy if exists incidencias_admin_write on public.incidencias;
 create policy incidencias_admin_write on public.incidencias for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');

-- MENSAJES
 drop policy if exists mensajes_select on public.mensajes;
 create policy mensajes_select on public.mensajes for select to authenticated using (incidencia_id in (select i.id from public.incidencias i where i.usuario_id=(select id from public.usuarios where auth_user_id=auth.uid())) or private.app_role() in ('admin','controller','auditor'));
 drop policy if exists mensajes_admin_write on public.mensajes;
 create policy mensajes_admin_write on public.mensajes for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');

-- TASKER
 drop policy if exists tareas_select on public.tareas;
 create policy tareas_select on public.tareas for select to authenticated using (private.app_role() in ('admin','auditor'));
 drop policy if exists tareas_admin_write on public.tareas;
 create policy tareas_admin_write on public.tareas for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');
 drop policy if exists registros_select on public.tarea_registros;
 create policy registros_select on public.tarea_registros for select to authenticated using (private.app_role() in ('admin','auditor'));
 drop policy if exists registros_admin_write on public.tarea_registros;
 create policy registros_admin_write on public.tarea_registros for all to authenticated using (private.app_role()='admin') with check (private.app_role()='admin');

-- NOTIFICACIONES
 drop policy if exists notificaciones_select_own on public.notificaciones;
 create policy notificaciones_select_own on public.notificaciones for select to authenticated using (usuario_id=(select id from public.usuarios where auth_user_id=auth.uid()));
 drop policy if exists notificaciones_update_own on public.notificaciones;
 create policy notificaciones_update_own on public.notificaciones for update to authenticated using (usuario_id=(select id from public.usuarios where auth_user_id=auth.uid())) with check (usuario_id=(select id from public.usuarios where auth_user_id=auth.uid()));

-- EMAIL LOGS
 drop policy if exists email_logs_staff_select on public.email_logs;
 create policy email_logs_staff_select on public.email_logs for select to authenticated using (private.app_role() in ('admin','auditor'));

-- USER_ROLES no se expone a cliente
 drop policy if exists user_roles_none on public.user_roles;

-- REALTIME para UI: mensajes/incidencias/notificaciones
DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table public.mensajes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.incidencias; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.notificaciones; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
