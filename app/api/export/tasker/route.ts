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
  let result = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

function inlineCell(ref: string, value: unknown, style = 0) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}

function numberCell(ref: string, value: number, style = 4) {
  const safe = Number.isFinite(value) ? value : 0
  return `<c r="${ref}" s="${style}"><v>${safe}</v></c>`
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
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
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

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('es-ES') : '-'
}

function formatDateOnly(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('es-ES') : '-'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: 'Mes no válido.' }, { status: 400 })
  }

  const [year, monthNumber] = monthParam.split('-').map(Number)
  if (!year || monthNumber < 1 || monthNumber > 12) {
    return NextResponse.json({ error: 'Mes no válido.' }, { status: 400 })
  }

  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1))
  const endDate = new Date(Date.UTC(year, monthNumber, 1))
  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const periodLabel = `${monthNames[monthNumber - 1]} de ${year}`

  // requireRole solo valida al usuario. Para el informe usamos el cliente
  // administrativo del servidor para que RLS no pueda devolver una exportación vacía.
  await requireRole(['admin', 'auditor'])
  const db = createAdminClient()

  const [
    { data: tasks, error: tasksError },
    { data: incidents, error: incidentsError },
    { data: users, error: usersError },
    { data: centers, error: centersError },
    { data: records, error: recordsError },
  ] = await Promise.all([
    db.from('tareas')
      .select('id,nombre,descripcion,incidencia_id,estado,fecha_creacion,fecha_cierre,centro_coste_id,eliminado')
      .eq('eliminado', false)
      .order('fecha_creacion', { ascending: true }),
    db.from('incidencias')
      .select('id,titulo,usuario_id,eliminado')
      .eq('eliminado', false),
    db.from('usuarios')
      .select('id,nombre,email,centro_coste_id'),
    db.from('centros_coste')
      .select('id,nombre'),
    db.from('tarea_registros')
      .select('id,tarea_id,usuario_id,horas,comentario,fecha_creacion')
      .gte('fecha_creacion', startIso)
      .lt('fecha_creacion', endIso)
      .order('fecha_creacion', { ascending: true }),
  ])

  const firstError = tasksError || incidentsError || usersError || centersError || recordsError
  if (firstError) {
    console.error('Error exportando Tasker:', firstError)
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  type Row = {
    id: number
    nombre: string
    descripcion: string | null
    incidencia_id: number | null
    estado: string
    fecha_creacion: string
    fecha_cierre: string | null
    centro_coste_id: number | null
  }

  type Incident = {
    id: number
    titulo: string
    usuario_id: number | null
  }

  type User = {
    id: number
    nombre: string
    email: string | null
    centro_coste_id: number | null
  }

  type Center = {
    id: number
    nombre: string
  }

  type RecordRow = {
    id: number
    tarea_id: number
    usuario_id: number | null
    horas: number | string
    comentario: string | null
    fecha_creacion: string
  }

  const taskRows = (tasks ?? []) as unknown as Row[]
  const incidentRows = (incidents ?? []) as unknown as Incident[]
  const userRows = (users ?? []) as unknown as User[]
  const centerRows = (centers ?? []) as unknown as Center[]
  const recordRows = (records ?? []) as unknown as RecordRow[]

  const incidentById = new Map<number, Incident>(incidentRows.map(item => [Number(item.id), item]))
  const userById = new Map<number, User>(userRows.map(item => [Number(item.id), item]))
  const centerById = new Map<number, string>(centerRows.map(item => [Number(item.id), item.nombre]))
  const recordsByTask = new Map<number, RecordRow[]>()

  for (const record of recordRows) {
    const taskId = Number(record.tarea_id)
    const list = recordsByTask.get(taskId) || []
    list.push(record)
    recordsByTask.set(taskId, list)
  }

  const inMonth = (value: string | null | undefined) => {
    if (!value) return false
    return value >= startIso && value < endIso
  }

  // La tarea entra en el informe si se creó en el mes, se cerró en el mes
  // o tiene al menos una imputación de horas durante el mes.
  const includedTasks = taskRows.filter(task => {
    const hasHours = (recordsByTask.get(Number(task.id)) || []).length > 0
    return inMonth(task.fecha_creacion) || inMonth(task.fecha_cierre) || hasHours
  })

  let totalHours = 0
  const hoursByCenter = new Map<string, number>()

  const reportRows = includedTasks.map(task => {
    const incident = task.incidencia_id ? incidentById.get(Number(task.incidencia_id)) : undefined
    const assignedUser = incident?.usuario_id ? userById.get(Number(incident.usuario_id)) : undefined

    // La tarea manda sobre el centro de coste: permite que un administrador
    // lo cambie manualmente. En tareas automáticas, si está vacío, heredamos
    // el centro del usuario que abrió la incidencia.
    const explicitCenterId = task.centro_coste_id ? Number(task.centro_coste_id) : null
    const inheritedCenterId = assignedUser?.centro_coste_id ? Number(assignedUser.centro_coste_id) : null
    const centerId = explicitCenterId ?? inheritedCenterId
    const centerName = centerId ? (centerById.get(centerId) || 'Sin asignar') : 'Sin asignar'
    const userName = assignedUser?.nombre || 'Sin asignar'

    const taskRecords = recordsByTask.get(Number(task.id)) || []
    const hours = taskRecords.reduce((sum, record) => sum + Number(record.horas || 0), 0)

    totalHours += hours
    hoursByCenter.set(centerName, (hoursByCenter.get(centerName) || 0) + hours)

    const workLog = taskRecords.length
      ? taskRecords.map(record => {
          const recordUser = record.usuario_id ? userById.get(Number(record.usuario_id)) : undefined
          const name = recordUser?.nombre || 'Usuario sin nombre'
          const comment = record.comentario ? ` · ${record.comentario}` : ''
          return `${formatDateOnly(record.fecha_creacion)} · ${name} · ${Number(record.horas).toFixed(2)} h${comment}`
        }).join(' | ')
      : 'Sin registros de horas'

    return {
      task,
      incident,
      userName,
      centerName,
      hours,
      workLog,
    }
  })

  const summaryRows: string[] = [
    '<row r="1" ht="34"><c r="A1" s="2" t="inlineStr"><is><t>REBIOS SL · REPORTE DE TAREAS</t></is></c><c r="B1" s="2"/><c r="C1" s="2"/><c r="D1" s="2"/></row>',
    `<row r="2">${inlineCell('A2', 'Periodo', 3)}${inlineCell('B2', periodLabel)}${inlineCell('C2', 'Fechas', 3)}${inlineCell('D2', `${formatDateOnly(startIso)} – ${formatDateOnly(new Date(endDate.getTime() - 86400000).toISOString())}`)}</row>`,
    `<row r="3">${inlineCell('A3', 'Tareas incluidas', 3)}${numberCell('B3', reportRows.length)}${inlineCell('C3', 'Total horas', 3)}${numberCell('D3', totalHours)}</row>`,
    '<row r="5"><c r="A5" s="1" t="inlineStr"><is><t>CENTRO DE COSTE</t></is></c><c r="B5" s="1" t="inlineStr"><is><t>HORAS</t></is></c></row>',
  ]

  let summaryRow = 6
  for (const [center, hours] of [...hoursByCenter.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))) {
    summaryRows.push(`<row r="${summaryRow}">${inlineCell(`A${summaryRow}`, center)}${numberCell(`B${summaryRow}`, hours)}</row>`)
    summaryRow++
  }

  const detailRows: string[] = [
    '<row r="1" ht="34"><c r="A1" s="2" t="inlineStr"><is><t>REPORTE DETALLADO DE TAREAS</t></is></c><c r="B1" s="2"/><c r="C1" s="2"/><c r="D1" s="2"/><c r="E1" s="2"/><c r="F1" s="2"/><c r="G1" s="2"/><c r="H1" s="2"/><c r="I1" s="2"/></row>',
    `<row r="2">${inlineCell('A2', 'Periodo', 3)}${inlineCell('B2', periodLabel, 3)}</row>`,
    '<row r="4">' + ['TAREA','USUARIO ASIGNADO','CENTRO DE COSTE','Nº DE HORAS','ESTADO','INCIDENCIA','FECHA CREACIÓN','FECHA CIERRE','DESCRIPCIÓN / TRABAJO'].map((header, index) => inlineCell(`${colLetter(index + 1)}4`, header, 1)).join('') + '</row>',
  ]

  let detailRow = 5
  for (const item of reportRows) {
    const incidenceText = item.incident
      ? `#INC-${String(item.incident.id).padStart(3, '0')} · ${item.incident.titulo}`
      : 'Sin incidencia'

    const description = item.task.descripcion || ''
    const work = description && item.workLog !== 'Sin registros de horas'
      ? `${description} | ${item.workLog}`
      : description || item.workLog

    detailRows.push(
      `<row r="${detailRow}">` +
      `${inlineCell(`A${detailRow}`, item.task.nombre)}` +
      `${inlineCell(`B${detailRow}`, item.userName)}` +
      `${inlineCell(`C${detailRow}`, item.centerName)}` +
      `${numberCell(`D${detailRow}`, item.hours)}` +
      `${inlineCell(`E${detailRow}`, item.task.estado)}` +
      `${inlineCell(`F${detailRow}`, incidenceText)}` +
      `${inlineCell(`G${detailRow}`, formatDate(item.task.fecha_creacion))}` +
      `${inlineCell(`H${detailRow}`, formatDate(item.task.fecha_cierre))}` +
      `${inlineCell(`I${detailRow}`, work)}` +
      '</row>',
    )
    detailRow++
  }

  detailRows.push(
    `<row r="${detailRow}" ht="24">` +
    `${inlineCell(`A${detailRow}`, '')}` +
    `${inlineCell(`B${detailRow}`, '')}` +
    `${inlineCell(`C${detailRow}`, 'TOTAL', 1)}` +
    `${numberCell(`D${detailRow}`, totalHours)}` +
    `${inlineCell(`E${detailRow}`, '')}` +
    `${inlineCell(`F${detailRow}`, '')}` +
    `${inlineCell(`G${detailRow}`, '')}` +
    `${inlineCell(`H${detailRow}`, '')}` +
    `${inlineCell(`I${detailRow}`, '')}` +
    '</row>',
  )

  const summaryCols = '<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="28" customWidth="1"/></cols>'
  const detailCols = '<cols><col min="1" max="1" width="36" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="4" width="14" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/><col min="6" max="6" width="38" customWidth="1"/><col min="7" max="8" width="20" customWidth="1"/><col min="9" max="9" width="72" customWidth="1"/></cols>'

  const summarySheet = worksheetXml({
    cols: summaryCols,
    rows: summaryRows,
    freezeRows: 5,
    merges: ['A1:D1'],
  })

  const detailSheet = worksheetXml({
    cols: detailCols,
    rows: detailRows,
    freezeRows: 4,
    autoFilter: `A4:I${Math.max(4, detailRow - 1)}`,
    merges: ['A1:I1'],
  })

  const workbookFiles = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
        'utf8',
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
        'utf8',
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Detalle" sheetId="2" r:id="rId2"/></sheets>` +
        `</workbook>`,
        'utf8',
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
        `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
        'utf8',
      ),
    },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml(), 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(summarySheet, 'utf8') },
    { name: 'xl/worksheets/sheet2.xml', data: Buffer.from(detailSheet, 'utf8') },
  ]

  const workbook = zipStore(workbookFiles)

  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_tasker_${monthParam}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
