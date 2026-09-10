import Link from 'next/link'
import { addTicketMessage, closeTicket, reopenTicket, startTicket } from '@/app/actions'
import { requireUser } from '@/lib/auth'
import { TicketLive } from '@/components/ticket-live'
import { oneRelation } from '@/lib/supabase/relations'

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ticketId = Number(id)
  const { supabase, profile } = await requireUser()
  const { data: ticket } = await supabase
    .from('incidencias')
    .select('id,titulo,descripcion,estado,fecha_creacion,usuario_id,usuarios:usuario_id(nombre,email)')
    .eq('id', ticketId)
    .eq('eliminado', false)
    .single()

  if (!ticket) return <div className="empty">Ticket no encontrado.</div>

  if (profile.rol === 'empleado' && ticket.usuario_id !== profile.id) {
    return <div className="empty">No tienes permiso para acceder a esta incidencia.</div>
  }

  const { data: messagesRaw } = await supabase
    .from('mensajes')
    .select('id,mensaje,adjunto,fecha_creacion,usuario_id,usuarios:usuario_id(nombre,rol)')
    .eq('incidencia_id', ticket.id)
    .order('fecha_creacion', { ascending: true })

  const messages = messagesRaw ?? []

  return <div className="stack">
    <div className="toolbar">
      <div>
        <Link href="/tickets" className="small" style={{ color: '#2563eb' }}>← Volver a incidencias</Link>
        <h1 style={{ margin: '8px 0 4px' }}>#INC-{String(ticket.id).padStart(3, '0')} · {ticket.titulo}</h1>
        <div className="muted">{new Date(ticket.fecha_creacion).toLocaleString('es-ES')} · {oneRelation(ticket.usuarios)?.nombre}</div>
      </div>
      <div className="row-actions">
        {profile.rol === 'admin' && ticket.estado === 'abierta' && <form action={startTicket.bind(null, ticket.id)}><button className="btn btn-warning">Poner en proceso</button></form>}
        {profile.rol === 'admin' && ticket.estado !== 'resuelta' && <form action={closeTicket.bind(null, ticket.id)}><button className="btn btn-success">Cerrar</button></form>}
        {profile.rol === 'admin' && ticket.estado === 'resuelta' && <form action={reopenTicket.bind(null, ticket.id)}><button className="btn btn-primary">Reabrir</button></form>}
      </div>
    </div>

    <div className="card pad">
      <div className="toolbar">
        <span className={`badge ${ticket.estado === 'abierta' ? 'red' : ticket.estado === 'en_proceso' ? 'amber' : 'green'}`}>{ticket.estado.replace('_', ' ')}</span>
        <span className="small muted">Conversación en tiempo real</span>
      </div>
      <div className="notice info" style={{ marginTop: 14 }}>
        <strong>Descripción</strong>
        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{ticket.descripcion}</div>
      </div>
      <div style={{ marginTop: 18 }}>
        <TicketLive
          ticketId={ticket.id}
          currentUserId={profile.id}
          currentRole={profile.rol}
          ownerId={ticket.usuario_id}
          initialMessages={messages as any}
        />
      </div>
    </div>

    {profile.rol !== 'auditor' && <div className="card pad">
      <h2 style={{ marginTop: 0 }}>Responder</h2>
      <p className="small muted">La respuesta se verá al instante en la conversación y se enviará por correo al destinatario correspondiente.</p>
      <form action={addTicketMessage} className="stack" encType="multipart/form-data" style={{ marginTop: 14 }}>
        <input type="hidden" name="incidencia_id" value={ticket.id} />
        <textarea className="input" name="mensaje" rows={5} placeholder="Escribe una respuesta..." />
        <label>Adjunto (opcional)<input className="input" type="file" name="adjunto" accept="image/jpeg,image/png,image/gif,application/pdf" /></label>
        <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Enviar respuesta</button>
      </form>
    </div>}
  </div>
}
