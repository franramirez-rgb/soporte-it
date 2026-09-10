import Link from 'next/link'
import { createTicket, deleteTicket } from '@/app/actions'
import { requireUser } from '@/lib/auth'

export default async function Tickets({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const { supabase, profile } = await requireUser()
  const filtro = typeof params.filtro === 'string' && ['activos', 'cerrados', 'todos'].includes(params.filtro) ? params.filtro : 'activos'
  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const pagina = Math.max(1, Number(params.pagina || 1))
  const pageSize = 15
  const from = (pagina - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('incidencias')
    .select('id,titulo,descripcion,estado,fecha_creacion,usuario_id,usuarios:usuario_id(nombre)', { count: 'exact' })
    .eq('eliminado', false)
    .order('fecha_creacion', { ascending: false })
    .range(from, to)

  if (filtro === 'activos') query = query.in('estado', ['abierta', 'en_proceso'])
  if (filtro === 'cerrados') query = query.eq('estado', 'resuelta')
  if (search) query = query.or(`titulo.ilike.%${search}%,descripcion.ilike.%${search}%`)

  const { data: ticketsRaw, count = 0 } = await query
  const tickets = ticketsRaw ?? []
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const users = profile.rol === 'admin'
    ? ((await supabase.from('usuarios').select('id,nombre,email').eq('estado_cuenta', 'activo').order('nombre')).data ?? [])
    : []

  const href = (nextFiltro: string, nextPage = 1) => `/tickets?filtro=${encodeURIComponent(nextFiltro)}&pagina=${nextPage}${search ? `&q=${encodeURIComponent(search)}` : ''}`

  return <div className="stack">
    <div className="toolbar">
      <div>
        <h1 style={{ margin: '0 0 4px' }}>Incidencias</h1>
        <div className="muted">Gestiona y consulta los tickets del portal.</div>
      </div>
      <a href="#nuevo" className="btn btn-primary">+ Nueva incidencia</a>
    </div>

    <div className="card pad">
      <div className="toolbar">
        <form method="GET" className="row-actions" style={{ flex: 1 }}>
          <select className="input" name="filtro" defaultValue={filtro} style={{ maxWidth: 180 }}>
            <option value="activos">Activos</option>
            <option value="cerrados">Cerrados</option>
            <option value="todos">Todos</option>
          </select>
          <input className="input" name="q" defaultValue={search} placeholder="Buscar título o descripción…" style={{ maxWidth: 420 }} />
          <button className="btn btn-secondary">Buscar</button>
        </form>
        <span className="small muted">{count ?? 0} resultados</span>
      </div>
    </div>

    <div id="nuevo" className="card pad">
      <h2 style={{ marginTop: 0 }}>Nueva incidencia</h2>
      <form action={createTicket} className="form-grid" encType="multipart/form-data">
        <label>Título<input className="input" name="titulo" required /></label>
        {profile.rol === 'admin' && <label>Usuario<select className="input" name="autor_id" defaultValue=""><option value="">Yo</option>{users.map(u => <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>)}</select></label>}
        <label className="full">Descripción<textarea className="input" name="descripcion" rows={5} required /></label>
        <label>Adjunto (opcional)<input className="input" type="file" name="adjunto" accept="image/jpeg,image/png,image/gif,application/pdf" /></label>
        <div><button className="btn btn-primary">Crear incidencia</button></div>
      </form>
    </div>

    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Código</th><th>Título</th>{(profile.rol === 'admin' || profile.rol === 'auditor') && <th>Empleado</th>}<th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {tickets.map((t: any) => <tr key={t.id}>
              <td><strong>#INC-{String(t.id).padStart(3, '0')}</strong></td>
              <td><strong>{t.titulo}</strong><div className="small muted">{String(t.descripcion || '').slice(0, 120)}</div></td>
              {(profile.rol === 'admin' || profile.rol === 'auditor') && <td>{t.usuarios?.nombre || '—'}</td>}
              <td>{new Date(t.fecha_creacion).toLocaleString('es-ES')}</td>
              <td><span className={`badge ${t.estado === 'abierta' ? 'red' : t.estado === 'en_proceso' ? 'amber' : 'green'}`}>{String(t.estado).replace('_', ' ')}</span></td>
              <td><div className="row-actions"><Link className="btn btn-secondary" href={`/tickets/${t.id}`}>Ver</Link>{profile.rol === 'admin' && <form action={deleteTicket.bind(null, t.id)}><button className="btn btn-danger">Papelera</button></form>}</div></td>
            </tr>)}
          </tbody>
        </table>
        {!tickets.length && <div className="empty">No hay incidencias en esta vista.</div>}
      </div>
    </div>

    {totalPages > 1 && <div className="toolbar">
      <Link className="btn btn-secondary" href={href(filtro, Math.max(1, pagina - 1))}>← Anterior</Link>
      <span className="small muted">Página {pagina} de {totalPages}</span>
      <Link className="btn btn-secondary" href={href(filtro, Math.min(totalPages, pagina + 1))}>Siguiente →</Link>
    </div>}
  </div>
}
