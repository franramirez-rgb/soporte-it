import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { readLegacyDump, parseTableInsert, rowsAsObjects } from './legacy-sql.mjs'

const input = process.argv.includes('--input') ? process.argv[process.argv.indexOf('--input') + 1] : path.resolve(process.cwd(), '../soporte_incidencias.sql')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.')

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const dump = await readLegacyDump(input)
const parsed = parseTableInsert(dump, 'usuarios')
const users = rowsAsObjects(parsed.columns, parsed.rows)

let page = 1
let existing = []
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw new Error(error.message)
  existing.push(...(data.users || []))
  if (!data.users || data.users.length < 1000) break
  page += 1
}

for (const legacy of users) {
  const email = String(legacy.email || '').trim().toLowerCase()
  if (!email) continue
  const emailConfirmed = ['activo', 'pendiente'].includes(legacy.estado_cuenta)
  let authUser = existing.find(user => user.email?.toLowerCase() === email)

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password_hash: legacy.password,
      email_confirm: emailConfirmed,
      user_metadata: { name: legacy.nombre },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    authUser = data.user
    existing.push(authUser)
  }

  const { error: profileError } = await supabase.from('usuarios').update({
    auth_user_id: authUser.id,
    nombre: legacy.nombre,
    email,
    rol: ['admin','controller','auditor','empleado'].includes(legacy.rol) ? legacy.rol : 'empleado',
    fecha_creacion: legacy.fecha_creacion,
    estado_cuenta: ['activo','pendiente','no_verificado'].includes(legacy.estado_cuenta) ? legacy.estado_cuenta : 'no_verificado',
    ultima_actividad: legacy.ultima_actividad,
    telefono: legacy.telefono,
    movil: legacy.movil,
    portatil: legacy.portatil,
    telefono_pendiente: legacy.telefono_pendiente,
    movil_pendiente: legacy.movil_pendiente,
    portatil_pendiente: legacy.portatil_pendiente,
    estado_material: ['sin_datos','pendiente','validado'].includes(legacy.estado_material) ? legacy.estado_material : 'sin_datos',
    centro_coste_id: legacy.centro_coste_id ? Number(legacy.centro_coste_id) : null,
    puesto: legacy.puesto,
    departamento: legacy.departamento,
  }).eq('email', email)
  if (profileError) throw new Error(`${email}: ${profileError.message}`)

  console.log(`[ok] ${email} -> ${authUser.id} (${legacy.estado_cuenta})`)
}

console.log('Migración de credenciales completada. Supabase Auth conserva el hash bcrypt existente; no se envía ningún correo de verificación/reset desde este script.')
