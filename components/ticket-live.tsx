'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: number
  mensaje: string
  adjunto: string | null
  fecha_creacion: string
  usuario_id: number
  usuarios?: { nombre: string; rol: string } | null
}

export function TicketLive({
  ticketId,
  currentUserId,
  currentRole,
  ownerId,
  initialMessages,
}: {
  ticketId: number
  currentUserId: number
  currentRole: string
  ownerId: number
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`ticket-live:${ticketId}`, {
        config: { presence: { key: String(currentUserId) } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `incidencia_id=eq.${ticketId}`,
        },
        async payload => {
          const row = payload.new as Message
          if (row.id === undefined) return

          const { data: sender } = await supabase
            .from('usuarios')
            .select('nombre,rol')
            .eq('id', row.usuario_id)
            .single()

          setMessages(prev =>
            prev.some(item => item.id === row.id)
              ? prev
              : [...prev, { ...row, usuarios: sender || null }],
          )
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id: number; role: string }>
        >
        const people = Object.values(state).flat()
        const otherParty =
          currentRole === 'admin'
            ? people.some(person => person.user_id === ownerId)
            : people.some(
                person =>
                  (person.role === 'admin' || person.role === 'controller') &&
                  person.user_id !== currentUserId,
              )
        setOnline(otherParty)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, role: currentRole })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, currentUserId, currentRole, ownerId])

  return (
    <div className="stack">
      <div className="presence-status">
        <span
          className="dot"
          style={{ background: online ? '#16a34a' : '#94a3b8' }}
          aria-hidden="true"
        />
        <span className="small muted">
          {online ? 'La otra parte está conectada' : 'La otra parte no está conectada'}
        </span>
      </div>

      {messages.map(message => (
        <div
          key={message.id}
          className={`message ${message.usuario_id === currentUserId ? 'mine' : ''}`}
        >
          <div className="message-meta">
            <span>
              <strong>{message.usuarios?.nombre || 'Usuario'}</strong>
              {message.usuarios?.rol ? ` · ${message.usuarios.rol}` : ''}
            </span>
            <span>{new Date(message.fecha_creacion).toLocaleString('es-ES')}</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.mensaje}</div>
          {message.adjunto && (
            <a
              href={`/api/attachments/${message.adjunto}`}
              className="attachment-link"
            >
              Ver adjunto
            </a>
          )}
        </div>
      ))}

      {!messages.length && <div className="empty">Aún no hay respuestas.</div>}
    </div>
  )
}
