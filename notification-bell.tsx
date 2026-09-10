'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow { id: number; titulo: string; mensaje: string; enlace: string | null; creada_at: string; leida_at: string | null }

export function NotificationBell({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [{ data }, { count: unread }] = await Promise.all([
        supabase.from('notificaciones').select('id,titulo,mensaje,enlace,creada_at,leida_at').eq('usuario_id', userId).order('creada_at', { ascending: false }).limit(8),
        supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('usuario_id', userId).is('leida_at', null),
      ])
      setItems((data ?? []) as NotificationRow[])
      setCount(unread ?? 0)
    }
    load()
    const channel = supabase.channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markRead = async (id: number) => {
    const supabase = createClient()
    await supabase.from('notificaciones').update({ leida_at: new Date().toISOString() }).eq('id', id).eq('usuario_id', userId)
    setItems(prev => prev.map(item => item.id === id ? { ...item, leida_at: new Date().toISOString() } : item))
    setCount(value => Math.max(0, value - 1))
  }

  return (
    <div className="notification-wrap">
      <button type="button" className="notification-button" onClick={() => setOpen(value => !value)} aria-label="Notificaciones">
        🔔 {count > 0 && <strong>{count}</strong>}
      </button>
      {open && (
        <div className="notification-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 10px' }}>
            <strong>Notificaciones</strong>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="small" style={{ color: '#2563eb' }}>Ver todas</Link>
          </div>
          {items.length === 0 ? <div className="empty">No hay notificaciones.</div> : items.map(item => (
            <Link
              href={item.enlace || '/dashboard'}
              key={item.id}
              className="notification-item"
              onClick={() => { if (!item.leida_at) void markRead(item.id); setOpen(false) }}
              style={{ background: item.leida_at ? 'transparent' : '#eff6ff' }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {!item.leida_at && <span className="dot" style={{ marginTop: 5 }} />}
                <div>
                  <strong style={{ fontSize: 13 }}>{item.titulo}</strong>
                  <div className="small muted" style={{ marginTop: 3 }}>{item.mensaje}</div>
                  <div className="small muted" style={{ marginTop: 4 }}>{new Date(item.creada_at).toLocaleString('es-ES')}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
