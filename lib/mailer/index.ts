import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'
import * as templates from '@/lib/mailer/templates'

const IT_EMAIL = process.env.IT_EMAIL || 'informatica@rebios.info'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

type EmailEvent =
  | 'registration_verified_admin'
  | 'ticket_created_admin'
  | 'ticket_created_user'
  | 'ticket_in_process_user'
  | 'ticket_message'
  | 'ticket_closed_user'
  | 'ticket_reopened_user'
  | 'equipment_assigned_user'

let cachedTransport: nodemailer.Transporter | null = null

function transport() {
  if (cachedTransport) return cachedTransport
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  return cachedTransport
}

function sender() {
  return {
    name: process.env.MAIL_FROM_NAME || 'Soporte IT REBIOS',
    address: process.env.MAIL_FROM_EMAIL || IT_EMAIL,
  }
}

async function logEmail(event: EmailEvent, to: string, subject: string, status: 'enviado' | 'fallido', entity?: { type: string; id?: number }, error?: string) {
  const admin = createAdminClient()
  await admin.from('email_logs').insert({
    evento: event,
    destinatario: to,
    asunto: subject,
    entidad_tipo: entity?.type,
    entidad_id: entity?.id ?? null,
    estado: status,
    error: error || null,
  })
}

async function send(event: EmailEvent, to: string, template: { subject: string; html: string }, entity?: { type: string; id?: number }) {
  try {
    await transport().sendMail({
      from: sender(),
      to,
      replyTo: IT_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    await logEmail(event, to, template.subject, 'enviado', entity)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logEmail(event, to, template.subject, 'fallido', entity, message)
    return false
  }
}

// Este módulo es exclusivamente para correos operativos del portal.
// Verificación, cambio/recuperación de contraseña y cambio de email pertenecen a Supabase Auth.
export async function sendRegistrationVerifiedAdminEmail(p: { name: string; email: string }) {
  return send('registration_verified_admin', IT_EMAIL, templates.registrationVerifiedAdminEmail({ ...p, url: `${SITE_URL}/usuarios` }), { type: 'usuario' })
}

export async function sendTicketCreatedAdminEmail(p: { id: number; title: string; description: string; userName: string }) {
  return send('ticket_created_admin', IT_EMAIL, templates.ticketCreatedAdminEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendTicketCreatedUserEmail(p: { id: number; title: string; description: string; name: string; email: string }) {
  return send('ticket_created_user', p.email, templates.ticketCreatedUserEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendTicketInProcessUserEmail(p: { id: number; title: string; name: string; email: string }) {
  return send('ticket_in_process_user', p.email, templates.ticketInProcessUserEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendTicketMessageEmail(p: { id: number; title: string; senderName: string; message: string; email: string }) {
  return send('ticket_message', p.email, templates.ticketMessageEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendTicketClosedUserEmail(p: { id: number; title: string; name: string; email: string }) {
  return send('ticket_closed_user', p.email, templates.ticketClosedUserEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendTicketReopenedUserEmail(p: { id: number; title: string; name: string; email: string }) {
  return send('ticket_reopened_user', p.email, templates.ticketReopenedUserEmail({ ...p, url: `${SITE_URL}/tickets/${p.id}` }), { type: 'incidencia', id: p.id })
}

export async function sendEquipmentAssignedUserEmail(p: { name: string; email: string; type: string; brand: string; model: string; identifier: string }) {
  return send('equipment_assigned_user', p.email, templates.equipmentAssignedUserEmail({ ...p, url: `${SITE_URL}/perfil` }), { type: 'equipo' })
}
