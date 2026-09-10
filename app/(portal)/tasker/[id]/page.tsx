import Link from 'next/link'
import { logHours } from '@/app/actions'
import { requireRole } from '@/lib/auth'

export default async function TaskDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string; vista?: string; page?: string }>
}) {
  const [{ id }, queryParams] = await Promise.all([params, searchParams])
  const taskId = Number(id)
  const month = /^\d{4}-\d{2}$/.test(queryParams.month || '') ? queryParams.month! : new Date().toISOString().slice(0, 7)
  const vista = queryParams.vista === 'archivo' ? 'archivo' : 'activos'
  const page = Math.max(1, Number(queryParams.page || 1))
  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const isAdmin = profile.rol === 'admin'

  if (!Number.isInteger(taskId) || taskId <= 0) return <div className="empty">Tarea no encontrada.</div>

  const [{ data: taskRaw }, { data: recordsRaw }] = await Promise.all([
    supabase
      .from('tareas')
      .select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id,centros:centro_coste_id(nombre),incidencias:incidencia_id(id,titulo,usuario_id,usuarios:usuario_id(nombre,email,centros:centro_coste_id(nombre)))')
      .eq('id', taskId)
      .eq('eliminado', false)
      .maybeSingle(),
    supabase
      .from('tarea_registros')
      .select('id,horas,comentario,fecha_creacion,usuario_id,usuarios:usuario_id(nombre)')
      .eq('tarea_id', taskId)
      .order('fecha_creacion', { ascending: false }),
  ])

  const task = taskRaw as any
  if (!task) return <div className="empty">Tarea no encontrada.</div>

  const records = (recordsRaw ?? []) as any[]
  const totalHours = records.reduce((sum, row) => sum + Number(row.horas), 0)
  const incident = task.incidencias ?? null
  const creator = incident?.usuarios ?? null
  const centerName = task.centros?.nombre || creator?.centros?.nombre || 'Sin asignar'
  const backHref = `/tasker?month=${encodeURIComponent(month)}&vista=${vista}&page=${page}`

  return (
    <div className="stack">
      <div className="toolbar">
        <div>
          <Link href={backHref} className="small">← Volver a Tasker</Link>
          <h1 style={{ margin: '8px 0 4px' }}>{task.nombre}</h1>
          <div className="muted">Tarea #{task.id} · {task.estado}</div>
        </div>
        <span className="badge blue">{totalHours.toFixed(2)} h</span>
      </div>

      <div className="grid g2">
        <div className="card pad">
          <h2 className="section-title">Resumen</h2>
          <dl className="detail-list">
            <div><dt>Centro de coste</dt><dd>{centerName}</dd></div>
            <div><dt>Incidencia</dt><dd>{incident ? <Link href={`/tickets/${incident.id}`}>#INC-{String(incident.id).padStart(3, '0')} · {incident.titulo}</Link> : 'Sin incidencia'}</dd></div>
            <div><dt>Creado por</dt><dd>{creator ? `${creator.nombre} · ${creator.email}` : 'Tarea manual'}</dd></div>
            <div><dt>Creación</dt><dd>{new Date(task.fecha_creacion).toLocaleString('es-ES')}</dd></div>
            <div><dt>Cierre</dt><dd>{task.fecha_cierre ? new Date(task.fecha_cierre).toLocaleString('es-ES') : '—'}</dd></div>
          </dl>
          <div className="notice info" style={{ marginTop: 16 }}>
            <strong>Descripción</strong>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{task.descripcion || 'Sin descripción.'}</div>
          </div>
        </div>

        {isAdmin && task.estado !== 'cerrada' && (
          <div className="card pad">
            <h2 className="section-title">Imputar horas</h2>
            <form action={logHours} className="stack" style={{ marginTop: 14 }}>
              <input type="hidden" name="tarea_id" value={task.id} />
              <label className="stack small"><strong>Horas</strong><input className="input" type="number" name="horas" min="0.05" step="0.05" required /></label>
              <label className="stack small"><strong>Comentario</strong><textarea className="input" name="comentario" rows={5} required /></label>
              <button className="btn btn-primary">Registrar horas</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="toolbar pad">
          <div><h2 className="section-title">Horas imputadas</h2><p className="section-subtitle">Detalle de los registros asociados a esta tarea.</p></div>
          <strong>{records.length} registros · {totalHours.toFixed(2)} h</strong>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Horas</th><th>Comentario</th></tr></thead>
            <tbody>{records.map(record => (
              <tr key={record.id}>
                <td>{new Date(record.fecha_creacion).toLocaleString('es-ES')}</td>
                <td>{record.usuarios?.nombre || `Usuario #${record.usuario_id}`}</td>
                <td><strong>{Number(record.horas).toFixed(2)} h</strong></td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{record.comentario}</td>
              </tr>
            ))}</tbody>
          </table>
          {!records.length && <div className="empty">Esta tarea todavía no tiene horas imputadas.</div>}
        </div>
      </div>
    </div>
  )
}
