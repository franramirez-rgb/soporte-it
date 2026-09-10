import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const DOC_RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\r\n\t]/g, ' ')
}

function colLetter(n: number) {
  let out = ''
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26) }
  return out
}

function inlineCell(ref: string, value: unknown, style = 0) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}
function numberCell(ref: string, value: number, style = 4) {
  return `<c r="${ref}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
}
function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b val="1"/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b val="1"/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b val="1"/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf></cellXfs></styleSheet>`
}
function crc32(buffer: Buffer) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); table[i] = c >>> 0 }
  let crc = 0xffffffff
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function zipStore(files: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [], centralParts: Buffer[] = []; let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8'), data = file.data, crc = crc32(data)
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(name.length,26); localParts.push(local,name,data)
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt32LE(crc,16); central.writeUInt32LE(data.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(name.length,28); central.writeUInt32LE(offset,42); centralParts.push(central,name)
    offset += local.length + name.length + data.length
  }
  const central = Buffer.concat(centralParts), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(offset,16)
  return Buffer.concat([...localParts, central, end])
}

function workbookFiles(sheetXml: { sheet1: string; sheet2: string }) {
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${DOC_RELS_NS}"><sheets><sheet name="Tareas cerradas" sheetId="1" r:id="rId1"/><sheet name="Resumen centros" sheetId="2" r:id="rId2"/></sheets></workbook>`
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_RELS_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${DOC_RELS_NS}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${DOC_RELS_NS}/styles" Target="styles.xml"/></Relationships>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_RELS_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  return [
    {name:'[Content_Types].xml',data:Buffer.from(types)}, {name:'_rels/.rels',data:Buffer.from(rootRels)}, {name:'xl/workbook.xml',data:Buffer.from(workbook)}, {name:'xl/_rels/workbook.xml.rels',data:Buffer.from(workbookRels)}, {name:'xl/styles.xml',data:Buffer.from(stylesXml())}, {name:'xl/worksheets/sheet1.xml',data:Buffer.from(sheetXml.sheet1)}, {name:'xl/worksheets/sheet2.xml',data:Buffer.from(sheetXml.sheet2)}
  ]
}

export async function GET(request: Request) {
  try {
    await requireRole(['admin', 'auditor'])
    const url = new URL(request.url)
    const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month')! : new Date().toISOString().slice(0,7)
    const [year, monthNumber] = month.split('-').map(Number)
    if (!year || monthNumber < 1 || monthNumber > 12) return NextResponse.json({error:'Mes no válido.'},{status:400})
    const start = new Date(Date.UTC(year,monthNumber-1,1)).toISOString(), end = new Date(Date.UTC(year,monthNumber,1)).toISOString()
    const admin = createAdminClient()
    const [{data:tasks,error:taskError},{data:records,error:recordError},{data:centers}] = await Promise.all([
      admin.from('tareas').select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id').eq('eliminado',false).eq('estado','cerrada').order('fecha_creacion',{ascending:true}),
      admin.from('tarea_registros').select('id,tarea_id,usuario_id,horas,comentario,fecha_creacion').gte('fecha_creacion',start).lt('fecha_creacion',end).order('fecha_creacion',{ascending:true}),
      admin.from('centros_coste').select('id,nombre').order('nombre')
    ])
    if (taskError) return NextResponse.json({error:taskError.message},{status:500})
    if (recordError) return NextResponse.json({error:recordError.message},{status:500})
    const monthRecords = records ?? [], byTask = new Map<number, typeof monthRecords>()
    for (const r of monthRecords) { const list=byTask.get(r.tarea_id) ?? []; list.push(r); byTask.set(r.tarea_id,list) }
    const rows = (tasks ?? []).map(task => ({task, taskRecords:byTask.get(task.id) ?? []})).filter(x => x.taskRecords.reduce((s,r)=>s+Number(r.horas),0) > 0)
    const incidentIds=[...new Set(rows.map(x=>x.task.incidencia_id).filter((id):id is number=>Boolean(id)))], userIds=[...new Set(monthRecords.map(r=>r.usuario_id))]
    const [{data:incidents},{data:users}] = await Promise.all([
      incidentIds.length ? admin.from('incidencias').select('id,usuario_id,titulo').in('id',incidentIds) : Promise.resolve({data:[] as Array<{id:number;usuario_id:number;titulo:string}>}),
      userIds.length ? admin.from('usuarios').select('id,nombre').in('id',userIds) : Promise.resolve({data:[] as Array<{id:number;nombre:string}>})
    ])
    const creatorIds=[...new Set((incidents??[]).map(i=>i.usuario_id).filter((id):id is number=>Boolean(id)))]
    const {data:creators}=creatorIds.length ? await admin.from('usuarios').select('id,nombre,centro_coste_id').in('id',creatorIds) : {data:[] as Array<{id:number;nombre:string;centro_coste_id:number|null}>}
    const incidentById=new Map((incidents??[]).map(i=>[i.id,i])), creatorById=new Map((creators??[]).map(u=>[u.id,u])), userById=new Map((users??[]).map(u=>[u.id,u.nombre])), centerById=new Map((centers??[]).map(c=>[c.id,c.nombre]))
    const details=rows.map(x=>{const incident=x.task.incidencia_id?incidentById.get(x.task.incidencia_id):undefined; const creator=incident?.usuario_id?creatorById.get(incident.usuario_id):undefined; const centerId=x.task.centro_coste_id??creator?.centro_coste_id??null; return {...x,incident,creator,centerName:centerId?centerById.get(centerId)||'Sin asignar':'Sin asignar',hours:x.taskRecords.reduce((s,r)=>s+Number(r.horas),0)}})
    const totalHours=details.reduce((s,x)=>s+x.hours,0), hoursByCenter=new Map<string,number>()
    for(const x of details) hoursByCenter.set(x.centerName,(hoursByCenter.get(x.centerName)||0)+x.hours)
    const rowsXml:string[]=['<row r="1" ht="34"><c r="A1" s="2" t="inlineStr"><is><t>REBIOS SL · REPORTE DE TAREAS CERRADAS</t></is></c></row>',`<row r="2">${inlineCell('A2','Periodo',3)}${inlineCell('B2',`${monthNumber}/${year}`)}${inlineCell('C2','Total horas',3)}${numberCell('D2',totalHours)}</row>`,`<row r="4">${['Fecha de creación','Nombre de la tarea','Usuario asignado','Centro de coste','Nº horas total','Título','Fecha imputación','Usuario que imputó','Horas imputadas','Trabajo realizado'].map((h,i)=>inlineCell(`${colLetter(i+1)}4`,h,1)).join('')}</row>`]
    let rowNum=5
    for(const x of details){
      const base=[new Date(x.task.fecha_creacion).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'}),x.task.nombre,x.creator?.nombre||'Sin asignar',x.centerName,x.hours,x.incident?.titulo||x.task.descripcion||'']
      x.taskRecords.forEach((r,idx)=>{const taskHours=idx===0?x.hours:null; const vals=[base[0],base[1],base[2],base[3],taskHours,base[5],new Date(r.fecha_creacion).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'}),userById.get(r.usuario_id)||`Usuario #${r.usuario_id}`,Number(r.horas),r.comentario||'Sin comentario']; rowsXml.push(`<row r="${rowNum}">${vals.map((v,i)=>i===4&&v!==null?numberCell(`${colLetter(i+1)}${rowNum}`,Number(v),4):i===8?numberCell(`${colLetter(i+1)}${rowNum}`,Number(v),4):inlineCell(`${colLetter(i+1)}${rowNum}`,v)).join('')}</row>`); rowNum++})
    }
    rowsXml.push(`<row r="${rowNum+1}">${inlineCell(`A${rowNum+1}`,'TOTAL',3)}${numberCell(`E${rowNum+1}`,totalHours,4)}</row>`)
    const sheet1=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${[18,32,24,24,16,36,20,24,16,55].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rowsXml.join('')}</sheetData><autoFilter ref="A4:J${rowNum-1}"/></worksheet>`
    const centerRows=['<row r="1">'+inlineCell('A1','DESGLOSE DE HORAS POR CENTRO DE COSTE',2)+'</row>',`<row r="3">${inlineCell('A3','Centro de coste',1)}${inlineCell('B3','Horas',1)}</row>`]; let cr=4
    for(const [name,h] of [...hoursByCenter.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es'))) centerRows.push(`<row r="${cr}">${inlineCell(`A${cr}`,name)}${numberCell(`B${cr}`,h)}</row>`),cr++
    centerRows.push(`<row r="${cr+1}">${inlineCell(`A${cr+1}`,'TOTAL',3)}${numberCell(`B${cr+1}`,totalHours)}</row>`)
    const sheet2=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="16" customWidth="1"/></cols><sheetData>${centerRows.join('')}</sheetData></worksheet>`
    const xlsx=zipStore(workbookFiles({sheet1,sheet2}))
    return new NextResponse(xlsx as unknown as BodyInit,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="reporte_tasker_${month}.xlsx"`,'Cache-Control':'no-store'}})
  } catch(error) { console.error('Error exportando Tasker:',error); return NextResponse.json({error:'No se pudo generar el Excel.'},{status:500}) }
}
