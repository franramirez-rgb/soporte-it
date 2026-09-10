import Link from 'next/link'
import { destroyTask, destroyTicket, restoreTask, restoreTicket } from '@/app/actions'
import { requireRole } from '@/lib/auth'

const PAGE_SIZE = 25

type SearchParams = Promise<{ tickets?: string; tareas?: string }>

export default async function Papelera({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const ticketPage = Math.max(1, Number(params.tickets || 1))
  const taskPage = Math.max(1, Number(params.tareas || 1))
  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const isAdmin = profile.rol === 'admin'

  const [{ data: ticketsRaw, count: ticketCount }, { data: tasksRaw, count: taskCount }] = await Promise.all([
    supabase
      .from('incidencias')
      .select('id,titulo,fecha_creacion', { count: 'exact' })
      .eq('eliminado', true)
      .order('fecha_creacion', { ascending: false })
      .range((ticketPage - 1) * PAGE_SIZE, ticketPage * PAGE_SIZE - 1),
    supabase
      .from('tareas')
      .select('id,nombre,fecha_creacion', { count: 'exact' })
      .eq('eliminado', true)
      .order('fecha_creacion', { ascending: false })
      .range((taskPage - 1) * PAGE_SIZE, taskPage * PAGE_SIZE - 1),
  ])

  const tickets = ticketsRaw ?? []
  const tasks = tasksRaw ?? []
  const ticketPages = Math.max(1, Math.ceil((ticketCount || 0) / PAGE_SIZE))
  const taskPages = Math.max(1, Math.ceil((taskCount || 0) / PAGE_SIZE))

  return (
    <div className="stack">
      <div className="hero">
        <div>
          <h1>Papelera</h1>
          <p>Recupera elementos o elimínalos definitivamente.</p>
        </div>
      </div>

      <div className="grid g2">
        <section className="card pad">
          <h2 className="section-title">Incidencias</h2>
          <p className="section-subtitle">{ticketCount || 0} elemento(s)</p>
          <div className="compact-list" style={{ marginTop: 14 }}>
            {tickets.length ? tickets.map(ticket => (
              <div className="message" key={ticket.id}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <strong>#INC-{String(ticket.id).padStart(3, '0')} · {ticket.titulo}</strong>
                  <span className="small muted">{new Date(ticket.fecha_creacion).toLocaleDateString('es-ES')}</span>
                </div>
                {isAdmin && (
                  <div className="row-actions" style={{ marginTop: 9 }}>
                    <form action={restoreTicket.bind(null, ticket.id)}><button className="btn btn-success btn-sm">Restaurar</button></form>
                    <form action={destroyTicket.bind(null, ticket.id)}><button className="btn btn-danger btn-sm">Eliminar definitivamente</button></form>
                  </div>
                )}
              </div>
            )) : <div className="empty">La papelera de incidencias está vacía.</div>}
          </div>
          {ticketPages > 1 && (
            <div className="pagination" style={{ marginTop: 14 }}>
              <Link className="btn btn-secondary" href={`/papelera?tickets=${Math.max(1, ticketPage - 1)}&tareas=${taskPage}`}>Anterior</Link>
              <span className="small muted">{ticketPage} / {ticketPages}</span>
              <Link className="btn btn-secondary" href={`/papelera?tickets=${Math.min(ticketPages, ticketPage + 1)}&tareas=${taskPage}`}>Siguiente</Link>
            </div>
          )}
        </section>

        <section className="card pad">
          <h2 className="section-title">Tareas</h2>
          <p className="section-subtitle">{taskCount || 0} elemento(s)</p>
          <div className="compact-list" style={{ marginTop: 14 }}>
            {tasks.length ? tasks.map(task => (
              <div className="message" key={task.id}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <strong>{task.nombre}</strong>
                  <span className="small muted">{new Date(task.fecha_creacion).toLocaleDateString('es-ES')}</span>
                </div>
                {isAdmin && (
                  <div className="row-actions" style={{ marginTop: 9 }}>
                    <form action={restoreTask.bind(null, task.id)}><button className="btn btn-success btn-sm">Restaurar</button></form>
                    <form action={destroyTask.bind(null, task.id)}><button className="btn btn-danger btn-sm">Eliminar definitivamente</button></form>
                  </div>
                )}
              </div>
            )) : <div className="empty">La papelera de tareas está vacía.</div>}
          </div>
          {taskPages > 1 && (
            <div className="pagination" style={{ marginTop: 14 }}>
              <Link className="btn btn-secondary" href={`/papelera?tickets=${ticketPage}&tareas=${Math.max(1, taskPage - 1)}`}>Anterior</Link>
              <span className="small muted">{taskPage} / {taskPages}</span>
              <Link className="btn btn-secondary" href={`/papelera?tickets=${ticketPage}&tareas=${Math.min(taskPages, taskPage + 1)}`}>Siguiente</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
