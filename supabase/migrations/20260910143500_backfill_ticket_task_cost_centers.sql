-- Garantiza que las tareas ligadas a una incidencia usen el centro de coste del creador del ticket.
update public.tareas t
set centro_coste_id = u.centro_coste_id
from public.incidencias i
join public.usuarios u on u.id = i.usuario_id
where t.incidencia_id = i.id
  and t.centro_coste_id is null
  and u.centro_coste_id is not null;
