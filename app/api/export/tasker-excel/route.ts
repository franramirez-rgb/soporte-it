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
    const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '')
      ? url.searchParams.get('month')!
      : new Date().toISOString().slice(0, 7)
    const [year, monthNumber] = month.split('-').map(Number)
    if (!year || monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json({ error: 'Mes no válido.' }, { status: 400 })
    }

    const start = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString()
    const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString()
    const admin = createAdminClient()

    const [{ data: tasks, error: taskError }, { data: records, error: recordError }, { data: centers }] = await Promise.all([
      admin
        .from('tareas')
        .select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id')
        .eq('eliminado', false)
        .eq('estado', 'cerrada')
        .order('fecha_creacion', { ascending: true }),
      admin
        .from('tarea_registros')
        .select('id,tarea_id,usuario_id,horas,comentario,fecha_creacion')
        .gte('fecha_creacion', start)
        .lt('fecha_creacion', end)
        .order('fecha_creacion', { ascending: true }),
      admin.from('centros_coste').select('id,nombre').order('nombre'),
    ])

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })
    if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

    const allTasks = tasks ?? []
    const monthRecords = records ?? []
    const recordsByTask = new Map<number, typeof monthRecords>()

    for (const record of monthRecords) {
      recordsByTask.set(record.tarea_id, [...(recordsByTask.get(record.tarea_id) ?? []), record])
    }

    // Solo se exportan tareas cerradas que tengan horas imputadas en el periodo seleccionado.
    const rows = allTasks.filter(task => {
      const taskRecords = recordsByTask.get(task.id) ?? []
      return taskRecords.reduce((sum, record) => sum + Number(record.horas), 0) > 0
    })

    const incidentIds = [...new Set(rows.map(t => t.incidencia_id).filter((id): id is number => Boolean(id)))]
    const userIds = [...new Set(monthRecords.map(r => r.usuario_id))]
    const [{ data: incidents }, { data: users }] = await Promise.all([
      incidentIds.length
        ? admin.from('incidencias').select('id,usuario_id,titulo').in('id', incidentIds)
        : Promise.resolve({ data: [] as Array<{ id: number; usuario_id: number; titulo: string }> }),
      userIds.length
        ? admin.from('usuarios').select('id,nombre').in('id', userIds)
        : Promise.resolve({ data: [] as Array<{ id: number; nombre: string }> }),
    ])

    const creatorIds = [...new Set((incidents ?? []).map(i => i.usuario_id).filter((id): id is number => Boolean(id)))]
    const { data: creators } = creatorIds.length
      ? await admin.from('usuarios').select('id,nombre,centro_coste_id').in('id', creatorIds)
      : { data: [] as Array<{ id: number; nombre: string; centro_coste_id: number | null }> }

    const incidentById = new Map((incidents ?? []).map(i => [i.id, i]))
    const creatorById = new Map((creators ?? []).map(u => [u.id, u]))
    const userById = new Map((users ?? []).map(u => [u.id, u.nombre]))
    const centerById = new Map((centers ?? []).map(c => [c.id, c.nombre]))

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const period = `${monthNames[monthNumber - 1]} de ${year}`
    let totalHours = 0
    const hoursByCenter = new Map<string, number>()

    const body = rows.map(task => {
      const incident = task.incidencia_id ? incidentById.get(task.incidencia_id) : undefined
      const creator = incident?.usuario_id ? creatorById.get(incident.usuario_id) : undefined
      const centerId = task.centro_coste_id ?? creator?.centro_coste_id ?? null
      const centerName = centerId ? centerById.get(centerId) || 'Sin asignar' : 'Sin asignar'
      const taskRecords = recordsByTask.get(task.id) ?? []
      const hours = taskRecords.reduce((sum, r) => sum + Number(r.horas), 0)
      totalHours += hours
      hoursByCenter.set(centerName, (hoursByCenter.get(centerName) || 0) + hours)

      const hourDetails = taskRecords.map(record => `<div class="hour"><span>${esc(date(record.fecha_creacion))}</span><span>${esc(userById.get(record.usuario_id) || `Usuario #${record.usuario_id}`)}</span><strong>${Number(record.horas).toFixed(2)} h</strong><span>${esc(record.comentario || 'Sin comentario')}</span></div>`).join('')

      return `<tr class="task"><td>${esc(date(task.fecha_creacion))}</td><td><strong>${esc(task.nombre)}</strong></td><td>${esc(creator?.nombre || 'Sin asignar')}</td><td>${esc(centerName)}</td><td class="number"><strong>${hours.toFixed(2)} h</strong></td><td>${esc(incident?.titulo || task.descripcion || '')}</td><td><div class="hours-list">${hourDetails}</div></td></tr>`
    }).join('')

    const centerRows = [...hoursByCenter.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([name, hours]) => `<tr><td>${esc(name)}</td><td class="number">${hours.toFixed(2)} h</td></tr>`)
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;color:#172033;margin:24px}
h1{font-size:22px;margin:0 0 6px}
h2{font-size:16px;margin:24px 0 10px}
.meta{margin:0 0 18px;color:#566176}
table{border-collapse:collapse;width:100%;font-size:11px}
th{background:#1f4e78;color:white;font-weight:bold;text-align:left;padding:9px;border:1px solid #c8d0da}
td{border:1px solid #c8d0da;padding:8px;vertical-align:top}
.task:nth-child(even){background:#f5f7fa}
.number{text-align:right;white-space:nowrap}
.hours-list{min-width:430px}
.hour{display:grid;grid-template-columns:125px 120px 65px 1fr;gap:7px;padding:5px 0;border-bottom:1px solid #e3e7ec}
.hour:last-child{border-bottom:0}
.muted{color:#6b7280}
.total{font-weight:bold;background:#e9eef5}
.summary{width:430px}
.summary th{background:#34495e}
</style>
</head>
<body>
<h1>REBIOS SL · REPORTE DE HORAS TASKER</h1>
<p class="meta"><strong>Periodo:</strong> ${esc(period)} &nbsp; · &nbsp; <strong>Tareas cerradas:</strong> ${rows.length} &nbsp; · &nbsp; <strong>Total:</strong> ${totalHours.toFixed(2)} h</p>
<table>
<thead><tr><th>Fecha de creación</th><th>Nombre de la tarea</th><th>Usuario asignado</th><th>Centro de coste</th><th>Nº horas</th><th>Título</th><th>Todas las horas imputadas</th></tr></thead>
<tbody>${body}</tbody>
<tfoot><tr class="total"><td colspan="4">TOTAL</td><td class="number">${totalHours.toFixed(2)} h</td><td colspan="2"></td></tr></tfoot>
</table>

<h2>Desglose de horas por centro de coste</h2>
<table class="summary">
<thead><tr><th>Centro de coste</th><th>Horas</th></tr></thead>
<tbody>${centerRows || '<tr><td colspan="2">Sin horas imputadas en el periodo</td></tr>'}</tbody>
<tfoot><tr class="total"><td>TOTAL</td><td class="number">${totalHours.toFixed(2)} h</td></tr></tfoot>
</table>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_tasker_${month}.xls"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error exportando Tasker:', error)
    return NextResponse.json({ error: 'No se pudo generar el Excel.' }, { status: 500 })
  }
}
