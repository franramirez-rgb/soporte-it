# V2.0 — Tasker, horas, Excel y centros de coste

## Cambios
- Tasker muestra solo tareas activas por defecto y conserva Archivo para tareas cerradas.
- Cada tarea tiene una página de detalle en `/tasker/[id]` con horas imputadas, usuario que las imputó, centro de coste e incidencia asociada.
- Las horas solo pueden imputarse a tareas activas y la acción de servidor lo valida.
- El Excel de Tasker pasa a ser un XLSX real con dos hojas: `Resumen` y `Detalle`.
- El reporte usa el mismo ciclo del legado: día 20 del mes anterior hasta día 19 del mes seleccionado.
- El reporte incluye tareas cerradas dentro del ciclo, horas, centro de coste, creador y registros de trabajo.
- Los usuarios muestran su centro de coste.
- Las tareas ligadas a una incidencia usan el centro de coste del usuario creador de esa incidencia, incluso al crear/editar una tarea manualmente.
- Se incluye un backfill para tareas históricas ligadas a incidencias sin centro de coste.

## Archivos principales
- `app/(portal)/tasker/page.tsx`
- `app/(portal)/tasker/[id]/page.tsx`
- `app/(portal)/tasker/[id]/loading.tsx`
- `app/api/export/tasker/route.ts`
- `app/actions.ts`
- `app/(portal)/usuarios/page.tsx`
- `app/globals.css`
- `supabase/migrations/20260910143500_backfill_ticket_task_cost_centers.sql`

## Comprobaciones
- 19 archivos TypeScript/TSX revisados mediante el compilador TypeScript: 0 diagnósticos de sintaxis.
- El XLSX se ha generado y abierto con `artifact_tool` para verificar su estructura, datos y formato.
