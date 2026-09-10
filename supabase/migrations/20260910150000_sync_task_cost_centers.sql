-- Mantiene la cadena Usuario -> Centro de coste -> Incidencia -> Tarea.
-- Una tarea vinculada a una incidencia debe usar el centro de coste
-- del usuario que creó esa incidencia.

-- Corrige tanto valores nulos como valores antiguos que hayan quedado
-- desactualizados respecto al creador de la incidencia.
update public.tareas t
set centro_coste_id = u.centro_coste_id
from public.incidencias i
join public.usuarios u on u.id = i.usuario_id
where t.incidencia_id = i.id
  and t.centro_coste_id is distinct from u.centro_coste_id;

create or replace function private.sync_task_cost_center()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  creator_center_id bigint;
begin
  if new.incidencia_id is null then
    return new;
  end if;

  select u.centro_coste_id
    into creator_center_id
  from public.incidencias i
  join public.usuarios u on u.id = i.usuario_id
  where i.id = new.incidencia_id;

  new.centro_coste_id := creator_center_id;
  return new;
end;
$$;

revoke all on function private.sync_task_cost_center() from public;
grant execute on function private.sync_task_cost_center() to authenticated;

drop trigger if exists tareas_sync_task_cost_center on public.tareas;
create trigger tareas_sync_task_cost_center
before insert or update of incidencia_id on public.tareas
for each row execute function private.sync_task_cost_center();

-- Si cambia el centro de coste de un usuario, actualizamos sus tareas
-- vinculadas a incidencias para no romper la misma relación de negocio.
create or replace function private.sync_user_task_cost_centers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.centro_coste_id is distinct from old.centro_coste_id then
    update public.tareas t
    set centro_coste_id = new.centro_coste_id
    from public.incidencias i
    where t.incidencia_id = i.id
      and i.usuario_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_user_task_cost_centers() from public;
grant execute on function private.sync_user_task_cost_centers() to authenticated;

drop trigger if exists usuarios_sync_task_cost_centers on public.usuarios;
create trigger usuarios_sync_task_cost_centers
after update of centro_coste_id on public.usuarios
for each row execute function private.sync_user_task_cost_centers();
