import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month')! : new Date().toISOString().slice(0, 7)
  const startDate = new Date(`${month}-01T00:00:00Z`)
  const endDate = new Date(startDate)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)
  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()
  const { supabase } = await requireRole(['admin','auditor'])
  const { data, error } = await supabase.from('tareas').select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centros:centro_coste_id(nombre),tarea_registros(horas,comentario,fecha_creacion)').eq('eliminado',false).order('fecha_creacion',{ascending:true})
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []).flatMap((task:any) => {
    const entries = (task.tarea_registros || []).filter((r:any) => String(r.fecha_creacion).startsWith(month))
    const hours = entries.reduce((s:number,r:any)=>s+Number(r.horas),0)
    return [[task.fecha_creacion, task.nombre, task.descripcion || '', task.centros?.nombre || 'Sin Asignar', task.estado, hours.toFixed(2), entries.map((r:any)=>r.comentario).join(' | ')]]
  })
  const csv = [['FECHA CREACIÓN','TAREA','DESCRIPCIÓN','CENTRO DE COSTE','ESTADO','HORAS','REGISTROS'], ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g,'""').replace(/\r?\n/g,' ')}"`).join(';')).join('\r\n')
  return new NextResponse('\ufeff' + csv, { headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition':`attachment; filename="tasker_${month}.csv"` } })
}
