import path from 'node:path'
import process from 'node:process'
import { readLegacyDump, parseTableInsert, rowsAsObjects } from './legacy-sql.mjs'

const args = process.argv.slice(2)
const inputIndex = args.indexOf('--input')
const input = inputIndex >= 0 && args[inputIndex + 1]
  ? path.resolve(args[inputIndex + 1])
  : path.resolve(process.cwd(), '../soporte_incidencias.sql')
const dryRun = args.includes('--dry-run')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!dryRun && (!url || !key)) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY. Usa --dry-run para validar el SQL sin conectar.')
}

const dump = await readLegacyDump(input)
const parsed = parseTableInsert(dump, 'usuarios')
if (!parsed.columns.length || !parsed.rows.length) {
  throw new Error(`No se encontraron INSERT de usuarios en ${input}`)
}

const users = rowsAsObjects(parsed.columns, parsed.rows)
const required = ['id', 'nombre', 'email', 'password', 'rol']
for (const field of required) {
  if (!parsed.columns.includes(field)) {
    throw new Error(`El SQL no contiene la columna esperada usuarios.${field}`)
  }
}

const invalid = users.filter((u) => !u.email || !u.password || String(u.password).length < 50)
if (invalid.length) {
  throw new Error(`Hay ${invalid.length} usuarios sin un hash de contraseña válido.`)
}

console.log(`Encontrados ${users.length} usuarios legacy.`)
console.log(`Hashes detectados: ${new Set(users.map((u) => String(u.password).slice(0, 4))).size === 1 ? String(users[0].password).slice(0, 4) : 'mixtos'}`)

if (dryRun) {
  const roles = users.reduce((acc, user) => {
    const role = ['admin', 'controller', 'auditor', 'empleado'].includes(user.rol) ? user.rol : 'empleado'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})
  console.log('Dry run OK:', { users: users.length, roles })
  process.exit(0)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const existing = new Map()
let page = 1
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw new Error(`No se pudo listar Auth: ${error.message}`)
  for (const user of data.users || []) {
    if (user.email) existing.set(user.email.toLowerCase(), user)
  }
  if (!data.users || data.users.length < 1000) break
  page += 1
}

let created = 0
let linked = 0
let skipped = 0

for (const legacy of users) {
  const email = String(legacy.email || '').trim().toLowerCase()
  if (!email) continue

  const role = ['admin', 'controller', 'auditor', 'empleado'].includes(legacy.rol)
    ? legacy.rol
    : 'empleado'
  const emailConfirmed = ['activo', 'pendiente'].includes(legacy.estado_cuenta)
  let authUser = existing.get(email)

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password_hash: legacy.password,
      email_confirm: emailConfirmed,
      user_metadata: { name: legacy.nombre, legacy_user_id: Number(legacy.id) },
      app_metadata: { role },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    if (!data.user) throw new Error(`${email}: Supabase no devolvió el usuario creado.`)
    authUser = data.user
    existing.set(email, authUser)
    created += 1
  } else {
    skipped += 1
  }

  const { error: profileError } = await supabase
    .from('usuarios')
    .update({
      auth_user_id: authUser.id,
      nombre: legacy.nombre,
      email,
      rol: role,
      fecha_creacion: legacy.fecha_creacion,
      estado_cuenta: ['activo', 'pendiente', 'no_verificado'].includes(legacy.estado_cuenta)
        ? legacy.estado_cuenta
        : 'no_verificado',
      ultima_actividad: legacy.ultima_actividad,
      telefono: legacy.telefono,
      movil: legacy.movil,
      portatil: legacy.portatil,
      telefono_pendiente: legacy.telefono_pendiente,
      movil_pendiente: legacy.movil_pendiente,
      portatil_pendiente: legacy.portatil_pendiente,
      estado_material: ['sin_datos', 'pendiente', 'validado'].includes(legacy.estado_material)
        ? legacy.estado_material
        : 'sin_datos',
      centro_coste_id: legacy.centro_coste_id ? Number(legacy.centro_coste_id) : null,
      puesto: legacy.puesto,
      departamento: legacy.departamento,
    })
    .eq('id', Number(legacy.id))

  if (profileError) throw new Error(`${email}: error vinculando public.usuarios: ${profileError.message}`)

  const { error: roleError } = await supabase.from('user_roles').upsert({
    auth_user_id: authUser.id,
    role,
  }, { onConflict: 'auth_user_id' })

  if (roleError) throw new Error(`${email}: error guardando user_roles: ${roleError.message}`)

  linked += 1
  console.log(`[ok] ${legacy.id} ${email} -> ${authUser.id} (${role})`)
}

console.log(`\nMigración terminada. creados=${created}, ya_existentes=${skipped}, vinculados=${linked}`)
console.log('No se envían correos de verificación ni de reset durante esta migración.')
