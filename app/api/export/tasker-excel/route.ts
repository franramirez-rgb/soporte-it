import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '-'
}

export async function GET(request: Request) {
  try {
    await requireRole(['admin', 'auditor'])
    const url = new URL(request.url)
    const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month')! : new Date().toISOString().slice(0, 7)
    const [year, monthNumber] = month.split('-').map(Number)
    if (!year || monthNumber < 1 || monthNumber > 12) return NextResponse.json({ error: 'Mes no válido.' }, { status: 400 })

    const start = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString()
    const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString()
    const admin = createAdminClient()

    const [{ data: tasks, error: taskError }, { data: records, error: recordError }, { data: centers }] = await Promise.all([
      admin.from('tareas').select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id').eq('eliminado', false).order('fecha_creacion', { ascending: true }),
      admin.from('tarea_registros').select('id,tarea_id,usuario_id,horas,comentario,fecha_creacion').gte('fecha_creacion', start).lt('fecha_creacion', end).order('fecha_creacion', { ascending: true }),
      admin.from('centros_coste').select('id,nombre').order('nombre'),
    ])
    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })
    if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

    const allTasks = tasks ?? []
    const monthRecords = records ?? []
    const recordTaskIds = new Set(monthRecords.map(r => r.tarea_id))
    const rows = allTasks.filter(task => {
      const created = task.fecha_creacion >= start && task.fecha_creacion < end
      const closed = Boolean(task.fecha_cierre && task.fecha_cierre >= start && task.fecha_cierre < end)
      return created || closed || recordTaskIds.has(task.id)
    })

    const incidentIds = [...new Set(rows.map(t => t.incidencia_id).filter((id): id is number => Boolean(id)))]
    const userIds = [...new Set(monthRecords.map(r => r.usuario_id))]
    const [{ data: incidents }, { data: users }] = await Promise.all([
      incidentIds.length ? admin.from('incidencias').select('id,usuario_id').in('id', incidentIds) : Promise.resolve({ data: [] as Array<{ id: number; usuario_id: number }> }),
      userIds.length ? admin.from('usuarios').select('id,nombre').in('id', userIds) : Promise.resolve({ data: [] as Array<{ id: number; nombre: string }> }),
    ])
    const creatorIds = [...new Set((incidents ?? []).map(i => i.usuario_id).filter((id): id is number => Boolean(id)))]
    const { data: creators } = creatorIds.length ? await admin.from('usuarios').select('id,nombre,centro_coste_id').in('id', creatorIds) : { data: [] as Array<{ id: number; nombre: string; centro_coste_id: number | null }> }

    const incidentById = new Map((incidents ?? []).map(i => [i.id, i]))
    const creatorById = new Map((creators ?? []).map(u => [u.id, u]))
    const userById = new Map((users ?? []).map(u => [u.id, u.nombre]))
    const centerById = new Map((centers ?? []).map(c => [c.id, c.nombre]))
    const recordsByTask = new Map<number, typeof monthRecords>()
    for (const record of monthRecords) recordsByTask.set(record.tarea_id, [...(recordsByTask.get(record.tarea_id) ?? []), record])

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const period = `${monthNames[monthNumber - 1]} de ${year}`
    let totalHours = 0

    const body = rows.map(task => {
      const incident = task.incidencia_id ? incidentById.get(task.incidencia_id) : undefined
      const creator = incident?.usuario_id ? creatorById.get(incident.usuario_id) : undefined
      const centerId = task.centro_coste_id ?? creator?.centro_coste_id ?? null
      const taskRecords = recordsByTask.get(task.id) ?? []
      const hours = taskRecords.reduce((sum, r) => sum + Number(r.horas), 0)
      totalHours += hours
      const work = taskRecords.length ? taskRecords.map(r => `${date(r.fecha_creacion)} · ${userById.get(r.usuario_id) || `Usuario #${r.usuario_id}`} · ${Number(r.horas).toFixed(2)} h · ${r.comentario || ''}`).join('<br>') : (task.descripcion || '')
      return `<tr><td>${esc(task.id)}</td><td><strong>${esc(task.nombre)}</strong></td><td>${esc(creator?.nombre || 'Sin asignar')}</td><td>${esc(centerId ? centerById.get(centerId) || 'Sin asignar' : 'Sin asignar')}</td><td>${hours.toFixed(2)}</td><td>${esc(task.estado)}</td><td>${esc(task.incidencia_id ? `#INC-${String(task.incidencia_id).padStart(3, '0')}` : 'Sin incidencia')}</td><td>${esc(date(task.fecha_creacion))}</td><td>${esc(date(task.fecha_cierre))}</td><td>${work}</td></tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th{background:#2563eb;color:white;font-weight:bold}th,td{border:1px solid #bbb;padding:7px;vertical-align:top}h1{font-size:20px}.total{font-weight:bold}</style></head><body><h1>REBIOS SL · REPORTE DETALLADO DE TAREAS</h1><p><strong>Periodo:</strong> ${esc(period)} &nbsp; <strong>Tareas:</strong> ${rows.length} &nbsp; <strong>Total horas:</strong> ${totalHours.toFixed(2)} h</p><table><thead><tr><th>ID</th><th>Tarea</th><th>Usuario</th><th>Centro de coste</th><th>Horas</th><th>Estado</th><th>Incidencia</th><th>Fecha creación</th><th>Fecha cierre</th><th>Trabajo / descripción</th></tr></thead><tbody>${body}</tbody><tfoot><tr class="total"><td colspan="4">TOTAL</td><td>${totalHours.toFixed(2)}</td><td colspan="5"></td></tr></tfoot></table></body></html>`
    return new NextResponse(html, { headers: { 'Content-Type': 'application/vnd.ms-excel; charset=utf-8', 'Content-Disposition': `attachment; filename="reporte_tasker_${month}.xls"`, 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error exportando Tasker:', error)
    return NextResponse.json({ error: 'No se pudo generar el Excel.' }, { status: 500 })
  }
}
