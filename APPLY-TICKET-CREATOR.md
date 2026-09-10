# Cambios de incidencias y Tasker

- La tabla de incidencias muestra siempre `Creado por`.
- Tasker muestra `Creado por` cuando la tarea procede de una incidencia.
- Cada nueva incidencia crea automáticamente una tarea abierta en Tasker.
- `incidencia_id` tiene un índice único para evitar tareas duplicadas.
- La eliminación de usuarios para admin se conserva.

Supabase ya tiene aplicado el índice único `idx_tareas_incidencia_unique`.
