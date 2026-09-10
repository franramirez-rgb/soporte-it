'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import {
  sendEquipmentAssignedUserEmail,
  sendRegistrationVerifiedAdminEmail,
  sendTicketClosedUserEmail,
  sendTicketCreatedAdminEmail,
  sendTicketCreatedUserEmail,
  sendTicketInProcessUserEmail,
  sendTicketMessageEmail,
  sendTicketReopenedUserEmail,
} from '@/lib/mailer'

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

function isStaff(role: string) {
  return role === 'admin' || role === 'controller'
}

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !profile || profile.estado_cuenta !== 'activo') redirect('/pendiente')
  return { supabase, admin, user, profile }
}

async function notifyUsers(admin: ReturnType<typeof createAdminClient>, users: number[], tipo: string, titulo: string, mensaje: string, enlace: string) {
  const ids = [...new Set(users)]
  if (!ids.length) return
  await admin.from('notificaciones').insert(ids.map(usuario_id => ({ usuario_id, tipo, titulo, mensaje, enlace })))
}

async function staffRecipients(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('usuarios')
    .select('id')
    .in('rol', ['admin', 'auditor'])
    .eq('estado_cuenta', 'activo')
  return (data ?? []).map(x => x.id)
}

async function uploadAttachment(admin: ReturnType<typeof createAdminClient>, ticketId: number, file: File) {
  if (!(file instanceof File) || file.size === 0) return null
  const allowed = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/gif', 'gif'],
    ['application/pdf', 'pdf'],
  ])
  const extension = allowed.get(file.type)
  if (!extension) throw new Error('Tipo de archivo no permitido. Solo se admiten JPG, PNG, GIF y PDF.')
  if (file.size > 8 * 1024 * 1024) throw new Error('El archivo no puede superar 8 MB.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `incidencia-${ticketId}/${crypto.randomUUID()}-${safeName || `adjunto.${extension}`}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await admin.storage.from('ticket-attachments').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function createTicket(formData: FormData) {
  const { admin, profile } = await ctx()
  if (!['admin', 'controller', 'empleado'].includes(profile.rol)) return

  const title = String(formData.get('titulo') || '').trim()
  const description = String(formData.get('descripcion') || '').trim()
  if (!title || !description) return

  const requestedAuthorId = Number(formData.get('autor_id') || 0)
  const authorId = profile.rol === 'admin' && requestedAuthorId ? requestedAuthorId : profile.id
  const { data: author } = await admin
    .from('usuarios')
    .select('id,nombre,email,centro_coste_id')
    .eq('id', authorId)
    .single()
  if (!author) throw new Error('Usuario no encontrado.')

  const { data: ticket, error } = await admin.from('incidencias').insert({
    titulo: title,
    descripcion: description,
    usuario_id: authorId,
    estado: 'abierta',
    eliminado: false,
  }).select('id').single()
  if (error || !ticket) throw new Error(error?.message || 'No se pudo crear la incidencia.')

  const file = formData.get('adjunto')
  const attachmentPath = file instanceof File && file.size > 0 ? await uploadAttachment(admin, ticket.id, file) : null
  if (attachmentPath) {
    const { error: messageError } = await admin.from('mensajes').insert({
      incidencia_id: ticket.id,
      usuario_id: authorId,
      mensaje: 'Archivo adjunto subido.',
      adjunto: attachmentPath,
    })
    if (messageError) throw new Error(messageError.message)
  }

  // Se conserva el comportamiento original: cada incidencia crea una tarea asociada.
  const { error: taskError } = await admin.from('tareas').insert({
    nombre: title,
    descripcion: description,
    incidencia_id: ticket.id,
    centro_coste_id: author.centro_coste_id,
    estado: 'abierta',
    eliminado: false,
  })
  if (taskError) throw new Error(taskError.message)

  const recipients = await staffRecipients(admin)
  const { error: notificationError } = await admin.from('notificaciones').insert(
    recipients.map(usuario_id => ({
      usuario_id,
      tipo: 'ticket',
      titulo: `Nueva incidencia #INC-${String(ticket.id).padStart(3, '0')}`,
      mensaje: `${author.nombre}: ${title}`,
      enlace: `/tickets/${ticket.id}`,
    })),
  )
  if (notificationError && recipients.length) throw new Error(notificationError.message)

  // El correo es una operación secundaria: un fallo SMTP no debe borrar ni bloquear el ticket.
  await Promise.allSettled([
    sendTicketCreatedAdminEmail({ id: ticket.id, title, description, userName: author.nombre }),
    sendTicketCreatedUserEmail({ id: ticket.id, title, description, name: author.nombre, email: author.email }),
  ])

  revalidatePath('/tickets')
  revalidatePath('/dashboard')
}

export async function addTicketMessage(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol === 'auditor') return

  const ticketId = Number(formData.get('incidencia_id'))
  const message = String(formData.get('mensaje') || '').trim()
  const file = formData.get('adjunto')
  const hasFile = file instanceof File && file.size > 0
  if (!ticketId || (!message && !hasFile)) return

  const { data: ticket } = await admin
    .from('incidencias')
    .select('id,titulo,usuario_id,estado')
    .eq('id', ticketId)
    .eq('eliminado', false)
    .single()
  if (!ticket) throw new Error('Ticket no encontrado.')

  if (profile.rol !== 'admin' && profile.rol !== 'controller' && ticket.usuario_id !== profile.id) {
    throw new Error('No tienes permiso para responder a este ticket.')
  }

  const { data: owner } = await admin.from('usuarios').select('id,nombre,email').eq('id', ticket.usuario_id).single()
  if (!owner) throw new Error('Propietario del ticket no encontrado.')

  const attachmentPath = hasFile ? await uploadAttachment(admin, ticketId, file as File) : null
  const text = message || 'Se ha añadido un archivo adjunto.'
  const { error } = await admin.from('mensajes').insert({
    incidencia_id: ticketId,
    usuario_id: profile.id,
    mensaje: text,
    adjunto: attachmentPath,
  })
  if (error) throw new Error(error.message)

  // Igualamos la lógica anterior: respuestas de soporte llegan al empleado;
  // respuestas del empleado llegan a informática.
  const fromSupport = profile.rol === 'admin' || profile.rol === 'controller'
  const destinationEmail = fromSupport ? owner.email : (process.env.IT_EMAIL || 'informatica@rebios.info')

  await sendTicketMessageEmail({
    id: ticketId,
    title: ticket.titulo,
    senderName: profile.nombre,
    message: text,
    email: destinationEmail,
  })

  const destinationUsers = fromSupport ? [owner.id] : await staffRecipients(admin)
  await notifyUsers(
    admin,
    destinationUsers,
    'mensaje',
    `Nueva respuesta en #INC-${String(ticketId).padStart(3, '0')}`,
    profile.nombre,
    `/tickets/${ticketId}`,
  )

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/tickets')
}

export async function startTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return

  const { data: ticket } = await admin
    .from('incidencias')
    .select('id,titulo,usuario_id,estado')
    .eq('id', id)
    .eq('eliminado', false)
    .single()
  if (!ticket || ticket.estado !== 'abierta') return

  await admin.from('incidencias').update({ estado: 'en_proceso' }).eq('id', id)
  await admin.from('tareas').update({ estado: 'abierta' }).eq('incidencia_id', id)

  const { data: owner } = await admin.from('usuarios').select('nombre,email').eq('id', ticket.usuario_id).single()
  if (owner) await sendTicketInProcessUserEmail({ id, title: ticket.titulo, name: owner.nombre, email: owner.email })
  await notifyUsers(admin, [ticket.usuario_id], 'ticket', `#INC-${String(id).padStart(3, '0')} en proceso`, 'Soporte IT ha empezado a trabajar en tu incidencia.', `/tickets/${id}`)

  revalidatePath(`/tickets/${id}`)
  revalidatePath('/tickets')
  revalidatePath('/dashboard')
}

export async function closeTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return

  const { data: ticket } = await admin.from('incidencias').select('id,titulo,usuario_id').eq('id', id).single()
  if (!ticket) return

  const now = new Date().toISOString()
  await admin.from('incidencias').update({ estado: 'resuelta' }).eq('id', id)
  await admin.from('tareas').update({ estado: 'cerrada', fecha_cierre: now }).eq('incidencia_id', id)

  const { data: owner } = await admin.from('usuarios').select('nombre,email').eq('id', ticket.usuario_id).single()
  if (owner) await sendTicketClosedUserEmail({ id, title: ticket.titulo, name: owner.nombre, email: owner.email })
  await notifyUsers(admin, [ticket.usuario_id], 'ticket', `#INC-${String(id).padStart(3, '0')} resuelto`, 'La incidencia ha sido cerrada por Soporte IT.', `/tickets/${id}`)

  revalidatePath(`/tickets/${id}`)
  revalidatePath('/tickets')
  revalidatePath('/dashboard')
}

export async function reopenTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return

  const { data: ticket } = await admin.from('incidencias').select('id,titulo,usuario_id').eq('id', id).single()
  if (!ticket) return

  await admin.from('incidencias').update({ estado: 'abierta' }).eq('id', id)
  await admin.from('tareas').update({ estado: 'abierta', fecha_cierre: null }).eq('incidencia_id', id)

  const { data: owner } = await admin.from('usuarios').select('nombre,email').eq('id', ticket.usuario_id).single()
  if (owner) await sendTicketReopenedUserEmail({ id, title: ticket.titulo, name: owner.nombre, email: owner.email })
  await notifyUsers(admin, [ticket.usuario_id], 'ticket', `#INC-${String(id).padStart(3, '0')} reabierto`, 'La incidencia ha sido reabierta.', `/tickets/${id}`)

  revalidatePath(`/tickets/${id}`)
  revalidatePath('/tickets')
  revalidatePath('/dashboard')
}

export async function deleteTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('incidencias').update({ eliminado: true }).eq('id', id)
  revalidatePath('/tickets')
  revalidatePath('/papelera')
}

export async function restoreTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('incidencias').update({ eliminado: false }).eq('id', id)
  revalidatePath('/tickets')
  revalidatePath('/papelera')
}

export async function destroyTicket(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const { data: relatedTasks } = await admin.from('tareas').select('id').eq('incidencia_id', id)
  const taskIds = (relatedTasks ?? []).map(x => x.id)
  if (taskIds.length) await admin.from('tarea_registros').delete().in('tarea_id', taskIds)
  await admin.from('mensajes').delete().eq('incidencia_id', id)
  await admin.from('tareas').update({ incidencia_id: null }).eq('incidencia_id', id)
  await admin.from('incidencias').delete().eq('id', id)
  revalidatePath('/tickets')
  revalidatePath('/papelera')
}

export async function createCostCenter(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const nombre = String(formData.get('nombre') || '').trim()
  if (nombre) await admin.from('centros_coste').insert({ nombre })
  revalidatePath('/tasker')
  revalidatePath('/material')
}

export async function deleteCostCenter(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('centros_coste').delete().eq('id', id)
  revalidatePath('/tasker')
  revalidatePath('/material')
}

export async function createTask(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const name = String(formData.get('nombre') || '').trim()
  if (!name) return
  await admin.from('tareas').insert({
    nombre: name,
    descripcion: String(formData.get('descripcion') || '').trim(),
    incidencia_id: formData.get('incidencia_id') ? Number(formData.get('incidencia_id')) : null,
    centro_coste_id: formData.get('centro_coste_id') ? Number(formData.get('centro_coste_id')) : null,
    estado: 'abierta',
    eliminado: false,
  })
  revalidatePath('/tasker')
}

export async function editTask(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const id = Number(formData.get('id'))
  await admin.from('tareas').update({
    nombre: String(formData.get('nombre') || '').trim(),
    descripcion: String(formData.get('descripcion') || '').trim(),
    incidencia_id: formData.get('incidencia_id') ? Number(formData.get('incidencia_id')) : null,
    centro_coste_id: formData.get('centro_coste_id') ? Number(formData.get('centro_coste_id')) : null,
  }).eq('id', id)
  revalidatePath('/tasker')
}

export async function toggleTask(id: number, cerrar: boolean) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('tareas').update(
    cerrar ? { estado: 'cerrada', fecha_cierre: new Date().toISOString() } : { estado: 'abierta', fecha_cierre: null },
  ).eq('id', id)
  revalidatePath('/tasker')
}

export async function deleteTask(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('tareas').update({ eliminado: true }).eq('id', id)
  revalidatePath('/tasker')
  revalidatePath('/papelera')
}

export async function restoreTask(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('tareas').update({ eliminado: false }).eq('id', id)
  revalidatePath('/tasker')
  revalidatePath('/papelera')
}

export async function destroyTask(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('tarea_registros').delete().eq('tarea_id', id)
  await admin.from('tareas').delete().eq('id', id)
  revalidatePath('/tasker')
  revalidatePath('/papelera')
}

export async function logHours(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const tareaId = Number(formData.get('tarea_id'))
  const horas = Number(String(formData.get('horas') || '0').replace(',', '.'))
  const comentario = String(formData.get('comentario') || '').trim()
  if (tareaId <= 0 || horas <= 0 || !comentario) return
  await admin.from('tarea_registros').insert({ tarea_id: tareaId, usuario_id: profile.id, horas, comentario })
  revalidatePath('/tasker')
}

export async function createEquipment(formData: FormData) {
  const { admin, profile } = await ctx()
  if (!isStaff(profile.rol)) return
  await admin.from('equipos').insert({
    tipo: String(formData.get('tipo') || 'otro'),
    marca: String(formData.get('marca') || '').trim(),
    modelo: String(formData.get('modelo') || '').trim(),
    identificador: String(formData.get('identificador') || '').trim(),
    estado_equipo: 'en_stock',
    observaciones: String(formData.get('observaciones') || '').trim(),
  })
  revalidatePath('/material')
}

export async function assignEquipment(id: number, userId: number) {
  const { admin, profile } = await ctx()
  if (!isStaff(profile.rol)) return
  const [{ data: equipment }, { data: user }] = await Promise.all([
    admin.from('equipos').select('tipo,marca,modelo,identificador').eq('id', id).single(),
    admin.from('usuarios').select('id,nombre,email,centro_coste_id').eq('id', userId).single(),
  ])
  if (!equipment || !user) return

  await admin.from('equipos').update({
    usuario_id: userId,
    centro_coste_id: user.centro_coste_id || null,
    estado_equipo: 'asignado',
  }).eq('id', id)

  await sendEquipmentAssignedUserEmail({
    name: user.nombre,
    email: user.email,
    type: equipment.tipo,
    brand: equipment.marca,
    model: equipment.modelo,
    identifier: equipment.identificador,
  })
  await notifyUsers(admin, [userId], 'material', 'Nuevo equipo asignado', `${equipment.marca} ${equipment.modelo}`, '/perfil')
  revalidatePath('/material')
  revalidatePath('/perfil')
}

export async function releaseEquipment(id: number, state: 'en_stock' | 'reparacion' | 'baja' = 'en_stock') {
  const { admin, profile } = await ctx()
  if (!isStaff(profile.rol)) return
  await admin.from('equipos').update({ usuario_id: null, centro_coste_id: null, estado_equipo: state }).eq('id', id)
  revalidatePath('/material')
  revalidatePath('/perfil')
}

export async function editEquipment(formData: FormData) {
  const { admin, profile } = await ctx()
  if (!isStaff(profile.rol)) return
  const id = Number(formData.get('id'))
  await admin.from('equipos').update({
    tipo: String(formData.get('tipo') || 'otro'),
    marca: String(formData.get('marca') || '').trim(),
    modelo: String(formData.get('modelo') || '').trim(),
    identificador: String(formData.get('identificador') || '').trim(),
    estado_equipo: String(formData.get('estado_equipo') || 'en_stock'),
    observaciones: String(formData.get('observaciones') || '').trim(),
  }).eq('id', id)
  revalidatePath('/material')
}

export async function deleteEquipment(id: number) {
  const { admin, profile } = await ctx()
  if (!isStaff(profile.rol)) return
  await admin.from('equipos').delete().eq('id', id)
  revalidatePath('/material')
}


export async function importUsersCsv(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const file = formData.get('archivo_csv')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecciona un CSV.')
  const raw = await file.text()
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return

  const rows = lines.slice(1).map(line => {
    const values = line.split(';').map(value => value.trim().replace(/^"|"$/g, ''))
    return {
      nombre: values[0] || '', email: (values[1] || '').toLowerCase(), centro: values[2] || '', puesto: values[3] || '',
      departamento: values[4] || '', rol: values[5] || 'empleado', password: values[6] || '123456',
      equipoTipo: (values[7] || '').toLowerCase(), equipoMarca: values[8] || '', equipoModelo: values[9] || '', equipoId: values[10] || '',
    }
  }).filter(row => row.nombre && row.email.includes('@'))

  const { data: centers } = await admin.from('centros_coste').select('id,nombre')
  const { data: existingAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let authUsers: User[] = existingAuth?.users ?? []
  let imported = 0
  let equipmentImported = 0

  for (const row of rows) {
    let centerId: number | null = null
    const center = centers?.find(c => c.nombre.trim().toLowerCase() === row.centro.toLowerCase())
    if (center) centerId = center.id

    let authUser = authUsers.find(user => user.email?.toLowerCase() === row.email)
    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: row.email,
        password: row.password || '123456',
        email_confirm: true,
        user_metadata: { name: row.nombre },
      })
      if (error || !data.user) throw new Error(`${row.email}: ${error?.message || 'No se pudo crear el usuario.'}`)
      authUser = data.user
      authUsers.push(authUser)
      imported += 1
    }

    let profileRow = (await admin.from('usuarios').select('id').eq('email', row.email).maybeSingle()).data
    if (!profileRow) {
      profileRow = (await admin.from('usuarios').insert({
        auth_user_id: authUser.id, nombre: row.nombre, email: row.email, rol: ['admin','controller','auditor','empleado'].includes(row.rol) ? row.rol : 'empleado',
        estado_cuenta: 'activo', centro_coste_id: centerId, puesto: row.puesto, departamento: row.departamento,
      }).select('id').single()).data
    } else {
      await admin.from('usuarios').update({ auth_user_id: authUser.id, nombre: row.nombre, rol: ['admin','controller','auditor','empleado'].includes(row.rol) ? row.rol : 'empleado', estado_cuenta: 'activo', centro_coste_id: centerId, puesto: row.puesto, departamento: row.departamento }).eq('id', profileRow.id)
    }

    if (profileRow && row.equipoTipo && row.equipoMarca && row.equipoId) {
      const allowed = ['telefono','movil','portatil','periferico','otro']
      const tipo = allowed.includes(row.equipoTipo) ? row.equipoTipo : 'otro'
      const exists = await admin.from('equipos').select('id').eq('identificador', row.equipoId).maybeSingle()
      if (!exists.data) {
        const { error } = await admin.from('equipos').insert({ tipo, marca: row.equipoMarca, modelo: row.equipoModelo || '-', identificador: row.equipoId, usuario_id: profileRow.id, centro_coste_id: centerId, estado_equipo: 'asignado' })
        if (!error) equipmentImported += 1
      }
    }
  }

  revalidatePath('/usuarios'); revalidatePath('/material')
}

export async function approveUser(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  await admin.from('usuarios').update({ estado_cuenta: 'activo' }).eq('id', id)
  revalidatePath('/usuarios')
}

export async function rejectUser(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const { data: user } = await admin.from('usuarios').select('auth_user_id').eq('id', id).single()
  if (user?.auth_user_id) await admin.auth.admin.deleteUser(user.auth_user_id, false)
  await admin.from('usuarios').delete().eq('id', id)
  revalidatePath('/usuarios')
}

export async function updateUser(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const id = Number(formData.get('id'))
  const name = String(formData.get('nombre') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const role = String(formData.get('rol') || 'empleado')
  const center = formData.get('centro_coste_id') ? Number(formData.get('centro_coste_id')) : null
  const puesto = String(formData.get('puesto') || '').trim()
  const departamento = String(formData.get('departamento') || '').trim()
  if (!name || !email || !['admin', 'controller', 'auditor', 'empleado'].includes(role)) return

  const { data: row } = await admin.from('usuarios').select('auth_user_id').eq('id', id).single()
  if (row?.auth_user_id) {
    const { error } = await admin.auth.admin.updateUserById(row.auth_user_id, { email })
    if (error) throw new Error(error.message)
  }
  await admin.from('usuarios').update({ nombre: name, email, rol: role, centro_coste_id: center, puesto, departamento }).eq('id', id)
  revalidatePath('/usuarios')
  revalidatePath('/perfil')
}

export async function createUserManual(formData: FormData) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const name = String(formData.get('nombre') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const role = String(formData.get('rol') || 'empleado')
  const center = formData.get('centro_coste_id') ? Number(formData.get('centro_coste_id')) : null
  const puesto = String(formData.get('puesto') || '').trim()
  const departamento = String(formData.get('departamento') || '').trim()
  if (!name || !email || password.length < 8) throw new Error('Nombre, email y una contraseña de al menos 8 caracteres son obligatorios.')

  const { data: authUser, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })
  if (error || !authUser.user) throw new Error(error?.message || 'No se pudo crear el usuario.')
  const { error: profileError } = await admin.from('usuarios').upsert({
    auth_user_id: authUser.user.id,
    nombre: name,
    email,
    rol: ['admin', 'controller', 'auditor', 'empleado'].includes(role) ? role : 'empleado',
    estado_cuenta: 'activo',
    centro_coste_id: center,
    puesto,
    departamento,
  }, { onConflict: 'email' })
  if (profileError) throw new Error(profileError.message)
  revalidatePath('/usuarios')
}

export async function sendUserInvitation(id: number) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const { data: user } = await admin.from('usuarios').select('nombre,email,rol').eq('id', id).single()
  if (!user) return
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(user.email, {
    data: { name: user.nombre },
    redirectTo: `${siteUrl()}/auth/callback?next=/pendiente`,
  })
  if (error) throw new Error(error.message)
  if (invited.user) await admin.from('usuarios').update({ auth_user_id: invited.user.id, rol: user.rol }).eq('id', id)
  revalidatePath('/usuarios')
}

export async function inviteExistingUser(id: number) {
  return sendUserInvitation(id)
}

export async function updateProfile(formData: FormData) {
  const { admin, supabase, profile } = await ctx()
  const name = String(formData.get('nombre') || '').trim()
  const email = String(formData.get('email') || '').trim()
  if (!name || !email) return

  await admin.from('usuarios').update({ nombre: name }).eq('id', profile.id)
  if (email !== profile.email) {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/perfil')
}

export async function markNotificationRead(id: number) {
  const { admin, profile } = await ctx()
  await admin.from('notificaciones').update({ leida_at: new Date().toISOString() }).eq('id', id).eq('usuario_id', profile.id)
  revalidatePath('/dashboard')
}

export async function markAllNotificationsRead() {
  const { admin, profile } = await ctx()
  await admin.from('notificaciones').update({ leida_at: new Date().toISOString() }).eq('usuario_id', profile.id).is('leida_at', null)
  revalidatePath('/dashboard')
}

export async function notifyRegistrationVerified(name: string, email: string) {
  const { admin, profile } = await ctx()
  if (profile.rol !== 'admin') return
  const { data } = await admin.from('usuarios').select('id').eq('email', email).single()
  if (data) await sendRegistrationVerifiedAdminEmail({ name, email })
}
