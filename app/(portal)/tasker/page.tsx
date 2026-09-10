import Link from 'next/link'
import { createCostCenter, createTask, deleteCostCenter, deleteTask, editTask, toggleTask } from '@/app/actions'
import { requireRole } from '@/lib/auth'

export default async function Tasker({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string; editar?: string; vista?: string }>
}) {
  const params = await searchParams
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month! : new Date().toISOString().slice(0, 7)
  const page = Math.max(1, Number(params.page || 1))
  const editId = Math.max(0, Number(params.editar || 0))
  const vista = params.vista === 'archivo' ? 'archivo' : 'activos'
  const pageSize = 25

  const startDate = new Date(`${month}-01T00:00:00Z`)
  const endDate = new Date(startDate)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)

  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const isAdmin = profile.rol === 'admin'

  const [
    { data: tasksRaw, count },
    { data: taskMetaRaw },
    { data: centersRaw },
    { data: ticketsRaw },
    { data: regsRaw },
    { data: editingRaw },
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from('tareas')
        .select('id,nombre,descripcion,incidencia_id,estado,fecha_creacion,fecha_cierre,centro_coste_id,centros:centro_coste_id(nombre),incidencias:incidencia_id(titulo,usuarios:usuario_id(nombre))', { count: 'exact' })
        .eq('eliminado', false)
      query = vista === 'archivo' ? query.eq('estado', 'cerrada') : query.neq('estado', 'cerrada')
      return query.order('fecha_creacion', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
    })(),
    supabase.from('tareas').select('id,centro_coste_id').eq('eliminado', false),
    supabase.from('centros_coste').select('id,nombre').order('nombre'),
    isAdmin
      ? supabase.from('incidencias').select('id,titulo').eq('eliminado', false).order('id', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: number; titulo: string }> }),
    supabase
      .from('tarea_registros')
      .select('id,tarea_id,horas,fecha_creacion')
      .gte('fecha_creacion', startDate.toISOString())
      .lt('fecha_creacion', endDate.toISOString())
      .order('fecha_creacion', { ascending: false }),
    editId > 0
      ? supabase.from('tareas').select('id,nombre,descripcion,incidencia_id,estado,centro_coste_id').eq('id', editId).eq('eliminado', false).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const tasks = (tasksRaw ?? []) as any[]
  const taskMeta = taskMetaRaw ?? []
  const centers = centersRaw ?? []
  const tickets = ticketsRaw ?? []
  const regs = regsRaw ?? []
  const editingTask = editingRaw ?? null

  const hoursByTask = new Map<number, number>()
  for (const row of regs) {
    hoursByTask.set(row.tarea_id, (hoursByTask.get(row.tarea_id) || 0) + Number(row.horas))
  }

  const centerByTask = new Map<number, number | null>(taskMeta.map(task => [task.id, task.centro_coste_id] as const))
  const hoursByCenter = new Map<number, number>()
  for (const row of regs) {
    const centerId = centerByTask.get(row.tarea_id)
    if (centerId) hoursByCenter.set(centerId, (hoursByCenter.get(centerId) || 0) + Number(row.horas))
  }

  const totalHours = regs.reduce((sum, row) => sum + Number(row.horas), 0)
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const query = (nextPage: number, editar?: number) => {
    const q = new URLSearchParams({ month, page: String(nextPage), vista })
    if (editar) q.set('editar', String(editar))
    return `/tasker?${q.toString()}`
  }

  return (
    <div className="stack">
      <div className="hero">
        <div>
          <h1>Tasker</h1>
          <p>{vista === 'archivo' ? 'Tareas cerradas archivadas.' : 'Tareas activas y horas por centro de coste.'}</p>
        </div>
        <div className="toolbar-right">
          <div className="row-actions">
            <Link className={`btn ${vista === 'activos' ? 'btn-primary' : 'btn-secondary'}`} href={query(1)}>Activas</Link>
            <Link className={`btn ${vista === 'archivo' ? 'btn-primary' : 'btn-secondary'}`} href={query(1)}>Archivo</Link>
          </div>
          <form method="GET" className="row-actions">
            <input type="hidden" name="vista" value={vista} />
            <input className="input compact-input" type="month" name="month" defaultValue={month} />
            <button className="btn btn-secondary">Aplicar</button>
          </form>
          <a className="btn btn-secondary" href={`/api/export/tasker?month=${month}`}>Exportar Excel</a>
        </div>
      </div>

      <div className="quick-grid">
        <div className="quick-card"><div className="label">Horas del mes</div><div className="value">{totalHours.toFixed(2)} h</div></div>
        {centers.slice(0, 3).map(center => (
          <div className="quick-card" key={center.id}>
            <div className="label">{center.nombre}</div>
            <div className="value">{(hoursByCenter.get(center.id) || 0).toFixed(2)} h</div>
          </div>
        ))}
      </div>

      {isAdmin && editingTask && (
        <div className="card pad edit-panel">
          <div className="toolbar">
            <div><h2 className="section-title">Editar tarea</h2><p className="section-subtitle">Modifica la tarea seleccionada.</p></div>
            <Link className="btn btn-ghost" href={query(page)}>Cerrar</Link>
          </div>
          <form action={editTask} className="form-grid">
            <input type="hidden" name="id" value={editingTask.id} />
            <label>Nombre<input className="input" name="nombre" defaultValue={editingTask.nombre} required /></label>
            <label>Incidencia<select className="input" name="incidencia_id" defaultValue={editingTask.incidencia_id || ''}><option value="">Sin incidencia</option>{tickets.map(ticket => <option key={ticket.id} value={ticket.id}>#INC-{String(ticket.id).padStart(3, '0')} · {ticket.titulo}</option>)}</select></label>
            <label>Centro de coste<select className="input" name="centro_coste_id" defaultValue={editingTask.centro_coste_id || ''}><option value="">Sin asignar</option>{centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}</select></label>
            <label className="full">Descripción<textarea className="input" name="descripcion" rows={4} defaultValue={editingTask.descripcion || ''} /></label>
            <button className="btn btn-primary">Guardar cambios</button>
          </form>
        </div>
      )}

      {isAdmin && !editingTask && (
        <div className="card pad">
          <h2 className="section-title">Nueva tarea</h2>
          <form action={createTask} className="form-grid" style={{ marginTop: 14 }}>
            <label>Nombre<input className="input" name="nombre" required /></label>
            <label>Incidencia<select className="input" name="incidencia_id"><option value="">Sin incidencia</option>{tickets.map(ticket => <option key={ticket.id} value={ticket.id}>#INC-{String(ticket.id).padStart(3, '0')} · {ticket.titulo}</option>)}</select></label>
            <label>Centro de coste<select className="input" name="centro_coste_id"><option value="">Sin asignar</option>{centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}</select></label>
            <label className="full">Descripción<textarea className="input" name="descripcion" rows={3} /></label>
            <button className="btn btn-primary full">Crear tarea</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Tarea</th><th>Incidencia</th><th>Creado por</th><th>Centro de coste</th><th>Horas</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <Link href={`/tasker/${task.id}?month=${encodeURIComponent(month)}&vista=${vista}&page=${page}`}><strong>{task.nombre}</strong></Link>
                    <div className="small muted truncate">{task.descripcion}</div>
                  </td>
                  <td>{task.incidencia_id ? `#INC-${String(task.incidencia_id).padStart(3, '0')}` : '—'}</td>
                  <td>{task.incidencias?.usuarios?.nombre || '—'}</td>
                  <td>{task.centros?.nombre || 'Sin asignar'}</td>
                  <td><strong>{(hoursByTask.get(task.id) || 0).toFixed(2)} h</strong></td>
                  <td><span className={`badge ${task.estado === 'cerrada' ? 'green' : 'blue'}`}>{task.estado}</span></td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-secondary btn-sm" href={`/tasker/${task.id}?month=${encodeURIComponent(month)}&vista=${vista}&page=${page}`}>Ver horas</Link>
                      {isAdmin && <>
                        <Link className="btn btn-secondary btn-sm" href={query(page, task.id)}>Editar</Link>
                        <form action={toggleTask.bind(null, task.id, task.estado !== 'cerrada')}><button className="btn btn-warning btn-sm">{task.estado === 'cerrada' ? 'Reabrir' : 'Cerrar'}</button></form>
                        <form action={deleteTask.bind(null, task.id)}><button className="btn btn-danger btn-sm">Papelera</button></form>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tasks.length && <div className="empty">{vista === 'archivo' ? 'No hay tareas archivadas.' : 'No hay tareas activas.'}</div>}
        </div>
      </div>

      {isAdmin && <div className="card pad">
        <div className="toolbar"><div><h2 className="section-title">Centros de coste</h2><p className="section-subtitle">{centers.length} centros</p></div></div>
        <form action={createCostCenter} className="row-actions"><input className="input" name="nombre" placeholder="Nuevo centro" required /><button className="btn btn-primary">Añadir</button></form>
        <div className="compact-list" style={{ marginTop: 14 }}>{centers.map(center => <div key={center.id} className="list-row"><span>{center.nombre}</span><form action={deleteCostCenter.bind(null, center.id)}><button className="btn btn-danger btn-sm">Eliminar</button></form></div>)}</div>
      </div>}

      {totalPages > 1 && <div className="pagination"><Link className="btn btn-secondary" href={query(Math.max(1, page - 1))}>Anterior</Link><span className="small muted">Página {page} de {totalPages}</span><Link className="btn btn-secondary" href={query(Math.min(totalPages, page + 1))}>Siguiente</Link></div>}
    </div>
  )
}
