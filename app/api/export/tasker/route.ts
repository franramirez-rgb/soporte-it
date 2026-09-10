import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '')
    ? url.searchParams.get('month')!
    : new Date().toISOString().slice(0, 7)

  const startDate = new Date(`${month}-01T00:00:00Z`)
  const endDate = new Date(startDate)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)

  const { supabase } = await requireRole(['admin', 'auditor'])
  const [{ data: tasks, error: taskError }, { data: regs, error: regsError }] = await Promise.all([
    supabase
      .from('tareas')
      .select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centros:centro_coste_id(nombre)')
      .eq('eliminado', false)
      .order('fecha_creacion', { ascending: true }),
    supabase
      .from('tarea_registros')
      .select('tarea_id,horas,comentario,fecha_creacion')
      .gte('fecha_creacion', startDate.toISOString())
      .lt('fecha_creacion', endDate.toISOString())
      .order('fecha_creacion', { ascending: true }),
  ])

  if (taskError || regsError) {
    return NextResponse.json({ error: taskError?.message || regsError?.message || 'Error exportando Tasker.' }, { status: 500 })
  }

  const entriesByTask = new Map<number, Array<{ horas: number; comentario: string; fecha_creacion: string }>>()
  for (const row of regs ?? []) {
    const entries = entriesByTask.get(row.tarea_id) ?? []
    entries.push({ horas: Number(row.horas), comentario: row.comentario, fecha_creacion: row.fecha_creacion })
    entriesByTask.set(row.tarea_id, entries)
  }

  const rows = (tasks ?? []).map(task => {
    const entries = entriesByTask.get(task.id) ?? []
    const hours = entries.reduce((sum, row) => sum + row.horas, 0)
    return [
      task.fecha_creacion,
      task.nombre,
      task.descripcion || '',
      task.centros?.[0]?.nombre || 'Sin Asignar',
      task.estado,
      hours.toFixed(2),
      entries.map(row => row.comentario).join(' | '),
    ]
  })

  const csv = [['FECHA CREACIÓN', 'TAREA', 'DESCRIPCIÓN', 'CENTRO DE COSTE', 'ESTADO', 'HORAS', 'REGISTROS'], ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(';'))
    .join('\r\n')

  return new NextResponse('\ufeff' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tasker_${month}.csv"`,
    },
  })
}
