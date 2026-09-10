import { destroyTask, destroyTicket, restoreTask, restoreTicket } from '@/app/actions'
import { requireRole } from '@/lib/auth'

export default async function Papelera() {
  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const [{ data: tickets }, { data: tasks }] = await Promise.all([
    supabase.from('incidencias').select('id,titulo,fecha_creacion').eq('eliminado', true).order('fecha_creacion', { ascending: false }),
    supabase.from('tareas').select('id,nombre,fecha_creacion').eq('eliminado', true).order('fecha_creacion', { ascending: false }),
  ])
  const safeTickets = tickets ?? []
  const safeTasks = tasks ?? []
  return <div className="stack"><div className="hero"><div><h1>Papelera</h1><p>Recupera elementos o elimínalos definitivamente.</p></div></div>
    <div className="grid g2">
      <div className="card pad"><h2 className="section-title">Incidencias</h2><p className="section-subtitle">{safeTickets.length} elemento(s)</p><div className="stack" style={{marginTop:14}}>{safeTickets.length ? safeTickets.map((x:any)=><div className="message" key={x.id}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong>#INC-{String(x.id).padStart(3,'0')} · {x.titulo}</strong><span className="small muted">{new Date(x.fecha_creacion).toLocaleString('es-ES')}</span></div>{profile.rol==='admin'&&<div className="row-actions" style={{marginTop:10}}><form action={restoreTicket.bind(null,x.id)}><button className="btn btn-success btn-sm">Restaurar</button></form><form action={destroyTicket.bind(null,x.id)}><button className="btn btn-danger btn-sm">Destruir</button></form></div>}</div>):<div className="empty">La papelera de incidencias está vacía.</div>}</div></div>
      <div className="card pad"><h2 className="section-title">Tareas</h2><p className="section-subtitle">{safeTasks.length} elemento(s)</p><div className="stack" style={{marginTop:14}}>{safeTasks.length ? safeTasks.map((x:any)=><div className="message" key={x.id}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong>{x.nombre}</strong><span className="small muted">{new Date(x.fecha_creacion).toLocaleString('es-ES')}</span></div>{profile.rol==='admin'&&<div className="row-actions" style={{marginTop:10}}><form action={restoreTask.bind(null,x.id)}><button className="btn btn-success btn-sm">Restaurar</button></form><form action={destroyTask.bind(null,x.id)}><button className="btn btn-danger btn-sm">Destruir</button></form></div>}</div>):<div className="empty">La papelera de tareas está vacía.</div>}</div></div>
    </div>
  </div>
}
