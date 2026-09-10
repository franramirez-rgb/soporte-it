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

const specs = {
  centros_coste: {},
  usuarios: {
    exclude: new Set(['password', 'token_recuperacion', 'token_expiracion', 'token_verificacion']),
    extra: row => ({ estado_cuenta: row.estado_cuenta || 'no_verificado' }),
  },
  equipos: {},
  incidencias: {},
  mensajes: {},
  tareas: {},
  tarea_registros: {},
}

for (const [table, spec] of Object.entries(specs)) {
  const parsed = parseTableInsert(dump, table)
  if (!parsed.rows.length) { console.log(`[skip] ${table}`); continue }
  const rows = rowsAsObjects(parsed.columns, parsed.rows).map(row => {
    const clean = Object.fromEntries(Object.entries(row).filter(([key]) => !spec.exclude?.has(key)))
    if (spec.extra) Object.assign(clean, spec.extra(row))
    if ('eliminado' in clean) clean.eliminado = clean.eliminado === '1'
    if ('horas' in clean && clean.horas !== null) clean.horas = Number(String(clean.horas).replace(',', '.'))
    for (const key of ['id','usuario_id','incidencia_id','tarea_id','centro_coste_id']) if (key in clean && clean[key] !== null) clean[key] = Number(clean[key])
    return clean
  })
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`[ok] ${table}: ${rows.length}`)
}

console.log('\nDatos importados. Ejecuta estas sentencias una vez para alinear las secuencias:')
for (const table of ['centros_coste','usuarios','equipos','incidencias','mensajes','tareas','tarea_registros']) {
  console.log(`select setval(pg_get_serial_sequence('public.${table}','id'), coalesce((select max(id) from public.${table}),0), true);`)
}
