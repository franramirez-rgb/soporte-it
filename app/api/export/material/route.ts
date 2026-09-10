import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const { supabase } = await requireRole(['admin','controller'])
  const { data, error } = await supabase.from('usuarios').select('nombre,email,telefono,movil,portatil').eq('estado_cuenta','activo').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []).map((row:any) => [row.nombre,row.email,row.telefono || '-',row.movil || '-',row.portatil || '-'])
  const csv = [['Nombre Empleado','Email','Teléfono / Ext.','Dispositivo Móvil','Ordenador Portátil'], ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g,'""').replace(/\r?\n/g,' ')}"`).join(';')).join('\r\n')
  return new NextResponse('\ufeff' + csv, { headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition':'attachment; filename="inventario_material.csv"' } })
}
