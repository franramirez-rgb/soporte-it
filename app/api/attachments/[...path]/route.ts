import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const file = decodeURIComponent(path.join('/'))
  if (!file || file.length > 500) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  const authUserId = data?.claims?.sub
  if (authError || typeof authUserId !== 'string') return new NextResponse('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const [{ data: profile }, { data: message }] = await Promise.all([
    admin.from('usuarios').select('id,rol').eq('auth_user_id', authUserId).maybeSingle(),
    admin.from('mensajes').select('incidencia_id').eq('adjunto', file).maybeSingle(),
  ])

  if (!profile) return new NextResponse('Forbidden', { status: 403 })
  if (!message) return new NextResponse('Not found', { status: 404 })

  const { data: ticket } = await admin.from('incidencias').select('usuario_id').eq('id', message.incidencia_id).maybeSingle()
  if (!ticket) return new NextResponse('Not found', { status: 404 })

  const canRead = ['admin', 'auditor', 'controller'].includes(profile.rol) || ticket.usuario_id === profile.id
  if (!canRead) return new NextResponse('Forbidden', { status: 403 })

  const { data: signed } = await admin.storage.from('ticket-attachments').createSignedUrl(file, 60)
  if (!signed?.signedUrl) return new NextResponse('Not found', { status: 404 })

  return NextResponse.redirect(signed.signedUrl)
}
