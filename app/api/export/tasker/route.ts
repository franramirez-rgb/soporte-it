import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\r\n\t]/g, ' ')
}

function colLetter(n: number) {
  let value = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    value = String.fromCharCode(65 + remainder) + value
    n = Math.floor((n - 1) / 26)
  }
  return value
}

function inlineCell(ref: string, value: unknown, style = 0) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}

function numberCell(ref: string, value: number, style = 4) {
  const safeValue = Number.isFinite(value) ? value : 0
  return `<c r="${ref}" s="${style}"><v>${safeValue}</v></c>`
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b val="1"/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b val="1"/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b val="1"/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
  </cellXfs>
</styleSheet>`
}

function worksheetXml({
  cols,
  rows,
  freezeRows,
  autoFilter,
  merges = [],
}: {
  cols: string
  rows: string[]
  freezeRows: number
  autoFilter?: string
  merges?: string[]
}) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  ${cols}
  <sheetData>${rows.join('')}</sheetData>
  ${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ''}
  ${merges.length ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>` : ''}
</worksheet>`
}

function crc32(buffer: Buffer) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const data = file.data
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + data.length
  }

  const central = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, central, end])
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '')
    ? url.searchParams.get('month')!
    : new Date().toISOString().slice(0, 7)

  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || monthNumber < 1 || monthNumber > 12) {
    return NextResponse.json({ error: 'Mes no válido.' }, { status: 400 })
  }

  // Mismo ciclo que el Excel legacy: del día 20 del mes anterior al día 19 del mes seleccionado.
  const startDate = new Date(Date.UTC(year, monthNumber - 2, 20))
  const endExclusive = new Date(Date.UTC(year, monthNumber - 1, 20))
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const periodLabel = `${monthNames[monthNumber - 1]} de ${year}`
  const cycleLabel = `${startDate.toLocaleDateString('es-ES', { timeZone: 'UTC' })} – ${new Date(endExclusive.getTime() - 86400000).toLocaleDateString('es-ES', { timeZone: 'UTC' })}`

  await requireRole(['admin', 'auditor'])

  // Para la exportación no usamos relaciones embebidas de PostgREST.
  // En este proyecto Supabase puede devolver algunas relaciones como arrays
  // y, además, una relación anidada a tarea_registros puede quedar vacía por
  // RLS aunque la consulta directa a esa tabla sí tenga datos. Eso hacía que
  // el Excel calculase 0 tareas aunque Tasker mostrase tareas y horas.
  // Consultamos cada tabla explícitamente y unimos los datos por sus FK.
  const admin = createAdminClient()
  const [tasksResult, recordsResult, incidentsResult, usersResult, centersResult] = await Promise.all([
    admin
      .from('tareas')
      .select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id')
      .eq('eliminado', false)
      .order('fecha_creacion', { ascending: true }),
    admin
      .from('tarea_registros')
      .select('id,tarea_id,horas,comentario,fecha_creacion,usuario_id')
      .gte('fecha_creacion', startDate.toISOString())
      .lt('fecha_creacion', endExclusive.toISOString())
      .order('fecha_creacion', { ascending: true }),
    admin
      .from('incidencias')
      .select('id,titulo,usuario_id')
      .eq('eliminado', false),
    admin
      .from('usuarios')
      .select('id,nombre,centro_coste_id'),
    admin
      .from('centros_coste')
      .select('id,nombre'),
  ])

  const firstError = tasksResult.error || recordsResult.error || incidentsResult.error || usersResult.error || centersResult.error
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

  const tasks = (tasksResult.data ?? []) as any[]
  const records = (recordsResult.data ?? []) as any[]
  const incidents = (incidentsResult.data ?? []) as any[]
  const users = (usersResult.data ?? []) as any[]
  const centers = (centersResult.data ?? []) as any[]

  const incidentById = new Map<number, any>(incidents.map(item => [item.id, item]))
  const userById = new Map<number, any>(users.map(item => [item.id, item]))
  const centerById = new Map<number, any>(centers.map(item => [item.id, item]))
  const recordsByTask = new Map<number, any[]>()
  for (const record of records) {
    const list = recordsByTask.get(record.tarea_id) || []
    list.push(record)
    recordsByTask.set(record.tarea_id, list)
  }

  // Una tarea pertenece al informe si se creó durante el ciclo, se cerró
  // durante el ciclo o tiene horas registradas durante el ciclo. Esto permite
  // que también aparezcan en Excel las tareas abiertas aunque tengan 0 horas.
  const rows = tasks.filter((task: any) => {
    const createdInCycle = task.fecha_creacion
      && task.fecha_creacion >= startDate.toISOString()
      && task.fecha_creacion < endExclusive.toISOString()
    const closedInCycle = task.estado === 'cerrada' && task.fecha_cierre
      && task.fecha_cierre >= startDate.toISOString()
      && task.fecha_cierre < endExclusive.toISOString()
    const hasHoursInCycle = (recordsByTask.get(task.id) || []).length > 0
    return Boolean(createdInCycle || closedInCycle || hasHoursInCycle)
  })

  const hoursByCenter = new Map<string, number>()
  let totalHours = 0

  for (const task of rows) {
    const taskRecords = recordsByTask.get(task.id) || []
    const incident = task.incidencia_id ? incidentById.get(task.incidencia_id) : null
    const creator = incident?.usuario_id ? userById.get(incident.usuario_id) : null
    const creatorCenter = creator?.centro_coste_id ? centerById.get(creator.centro_coste_id) : null
    const taskCenter = task.centro_coste_id ? centerById.get(task.centro_coste_id) : null
    const center = creatorCenter?.nombre || taskCenter?.nombre || 'Sin Asignar'
    const hours = taskRecords.reduce((sum: number, record: any) => sum + Number(record.horas || 0), 0)
    totalHours += hours
    hoursByCenter.set(center, (hoursByCenter.get(center) || 0) + hours)
  }

  const summaryRows: string[] = [
    '<row r="1" ht="34"><c r="A1" s="2" t="inlineStr"><is><t>REBIOS SL · REPORTE DE TAREAS</t></is></c><c r="B1" s="2"/><c r="C1" s="2"/><c r="D1" s="2"/></row>',
    `<row r="2">${inlineCell('A2', 'Periodo de trabajo', 3)}${inlineCell('B2', cycleLabel)}${inlineCell('C2', 'Mes de reporte', 3)}${inlineCell('D2', periodLabel)}</row>`,
    `<row r="3">${inlineCell('A3', 'Tareas incluidas', 3)}${numberCell('B3', rows.length)}${inlineCell('C3', 'Total horas', 3)}${numberCell('D3', totalHours)}</row>`,
    '<row r="5"><c r="A5" s="1" t="inlineStr"><is><t>CENTRO DE COSTE</t></is></c><c r="B5" s="1" t="inlineStr"><is><t>HORAS</t></is></c></row>',
  ]

  let summaryRow = 6
  for (const [center, hours] of [...hoursByCenter.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))) {
    summaryRows.push(`<row r="${summaryRow}">${inlineCell(`A${summaryRow}`, center)}${numberCell(`B${summaryRow}`, hours)}</row>`)
    summaryRow++
  }

  const detailRows: string[] = [
    '<row r="1" ht="34"><c r="A1" s="2" t="inlineStr"><is><t>REPORTE DETALLADO DE TAREAS</t></is></c></row>',
    `<row r="2">${inlineCell('A2', 'Ciclo', 3)}${inlineCell('B2', cycleLabel, 3)}</row>`,
    '<row r="4">' + ['FECHA CREACIÓN','FECHA CIERRE','ESTADO','TÍTULO','DESCRIPCIÓN','CENTRO DE COSTE','CREADO POR','HORAS','REGISTRO DE TRABAJO'].map((header, index) => inlineCell(`${colLetter(index + 1)}4`, header, 1)).join('') + '</row>',
  ]

  let rowNumber = 5
  for (const task of rows) {
    const taskRecords = recordsByTask.get(task.id) || []
    const incident = task.incidencia_id ? incidentById.get(task.incidencia_id) : null
    const creator = incident?.usuario_id ? userById.get(incident.usuario_id) : null
    const creatorCenter = creator?.centro_coste_id ? centerById.get(creator.centro_coste_id) : null
    const taskCenter = task.centro_coste_id ? centerById.get(task.centro_coste_id) : null
    const center = creatorCenter?.nombre || taskCenter?.nombre || 'Sin Asignar'
    const creatorName = creator?.nombre || '—'
    const hours = taskRecords.reduce((sum: number, record: any) => sum + Number(record.horas || 0), 0)
    const work = taskRecords.length
      ? taskRecords.map((record: any) => `${new Date(record.fecha_creacion).toLocaleDateString('es-ES')} · ${userById.get(record.usuario_id)?.nombre || `Usuario #${record.usuario_id}`} · ${Number(record.horas || 0).toFixed(2)} h · ${record.comentario || ''}`).join(' | ')
      : 'Sin registros detallados'

    detailRows.push(`<row r="${rowNumber}">${inlineCell(`A${rowNumber}`, task.fecha_creacion ? new Date(task.fecha_creacion).toLocaleString('es-ES') : '-')}${inlineCell(`B${rowNumber}`, task.fecha_cierre ? new Date(task.fecha_cierre).toLocaleString('es-ES') : '-')}${inlineCell(`C${rowNumber}`, task.estado)}${inlineCell(`D${rowNumber}`, task.nombre)}${inlineCell(`E${rowNumber}`, task.descripcion || '')}${inlineCell(`F${rowNumber}`, center)}${inlineCell(`G${rowNumber}`, creatorName)}${numberCell(`H${rowNumber}`, hours)}${inlineCell(`I${rowNumber}`, work)}</row>`)
    rowNumber++
  }

  detailRows.push(`<row r="${rowNumber}" ht="24">${inlineCell(`A${rowNumber}`, '')}${inlineCell(`B${rowNumber}`, '')}${inlineCell(`C${rowNumber}`, '')}${inlineCell(`D${rowNumber}`, '')}${inlineCell(`E${rowNumber}`, '')}${inlineCell(`F${rowNumber}`, 'TOTAL HORAS', 1)}${inlineCell(`G${rowNumber}`, '')}${numberCell(`H${rowNumber}`, totalHours)}${inlineCell(`I${rowNumber}`, '', 1)}</row>`)

  const summaryCols = '<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/></cols>'
  const detailCols = '<cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="4" width="32" customWidth="1"/><col min="5" max="5" width="42" customWidth="1"/><col min="6" max="6" width="24" customWidth="1"/><col min="7" max="7" width="30" customWidth="1"/><col min="8" max="8" width="14" customWidth="1"/><col min="9" max="9" width="70" customWidth="1"/></cols>'

  const summarySheet = worksheetXml({ cols: summaryCols, rows: summaryRows, freezeRows: 5, merges: ['A1:D1'] })
  const detailSheet = worksheetXml({ cols: detailCols, rows: detailRows, freezeRows: 4, autoFilter: `A4:I${Math.max(4, rowNumber - 1)}`, merges: ['A1:I1'] })

  const files = [
    { name: '[Content_Types].xml', data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Detalle" sheetId="2" r:id="rId2"/></sheets></workbook>`, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`, 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml(), 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(summarySheet, 'utf8') },
    { name: 'xl/worksheets/sheet2.xml', data: Buffer.from(detailSheet, 'utf8') },
  ]

  const workbook = zipStore(files)
  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_tasker_${month}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
