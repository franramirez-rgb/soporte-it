import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }) : '-'
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
      admin.from('tareas').select('id,nombre,descripcion,estado,fecha_creacion,fecha_cierre,centro_coste_id,incidencia_id').eq('eliminado', false).eq('estado', 'cerrada').order('fecha_creacion', { ascending: true }),
      admin.from('tarea_registros').select('id,tarea_id,usuario_id,horas,comentario,fecha_creacion').gte('fecha_creacion', start).lt('fecha_creacion', end).order('fecha_creacion', { ascending: true }),
      admin.from('centros_coste').select('id,nombre').order('nombre'),
    ])
    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })
    if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 })

    const monthRecords = records ?? []
    const recordsByTask = new Map<number, typeof monthRecords>()
    for (const record of monthRecords) {
      const list = recordsByTask.get(record.tarea_id) ?? []
      list.push(record)
      recordsByTask.set(record.tarea_id, list)
    }
    const rows = (tasks ?? []).map(task => ({ task, taskRecords: recordsByTask.get(task.id) ?? [] })).filter(({ taskRecords }) => taskRecords.reduce((sum, record) => sum + Number(record.horas), 0) > 0)
    const incidentIds = [...new Set(rows.map(x => x.task.incidencia_id).filter((id): id is number => Boolean(id)))]
    const userIds = [...new Set(monthRecords.map(record => record.usuario_id))]
    const [{ data: incidents }, { data: users }] = await Promise.all([
      incidentIds.length ? admin.from('incidencias').select('id,usuario_id,titulo').in('id', incidentIds) : Promise.resolve({ data: [] as Array<{ id: number; usuario_id: number; titulo: string }> }),
      userIds.length ? admin.from('usuarios').select('id,nombre').in('id', userIds) : Promise.resolve({ data: [] as Array<{ id: number; nombre: string }> }),
    ])
    const creatorIds = [...new Set((incidents ?? []).map(i => i.usuario_id).filter((id): id is number => Boolean(id)))]
    const { data: creators } = creatorIds.length ? await admin.from('usuarios').select('id,nombre,centro_coste_id').in('id', creatorIds) : { data: [] as Array<{ id: number; nombre: string; centro_coste_id: number | null }> }
    const incidentById = new Map((incidents ?? []).map(i => [i.id, i]))
    const creatorById = new Map((creators ?? []).map(u => [u.id, u]))
    const userById = new Map((users ?? []).map(u => [u.id, u.nombre]))
    const centerById = new Map((centers ?? []).map(c => [c.id, c.nombre]))
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const period = `${monthNames[monthNumber - 1]} de ${year}`
    let totalHours = 0
    const hoursByCenter = new Map<string, number>()
    const details = rows.map(({ task, taskRecords }) => {
      const incident = task.incidencia_id ? incidentById.get(task.incidencia_id) : undefined
      const creator = incident?.usuario_id ? creatorById.get(incident.usuario_id) : undefined
      const centerId = task.centro_coste_id ?? creator?.centro_coste_id ?? null
      const centerName = centerId ? centerById.get(centerId) || 'Sin asignar' : 'Sin asignar'
      const hours = taskRecords.reduce((sum, record) => sum + Number(record.horas), 0)
      totalHours += hours
      hoursByCenter.set(centerName, (hoursByCenter.get(centerName) || 0) + hours)
      return { task, taskRecords, incident, creator, centerName, hours }
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'REBIOS SL'
    workbook.company = 'REBIOS SL'
    workbook.created = new Date()
    workbook.modified = new Date()
    const sheet = workbook.addWorksheet('Reporte Tasker', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
      views: [{ state: 'frozen', ySplit: 4 }],
    })
    sheet.columns = [
      { key: 'created', width: 18 }, { key: 'task', width: 34 }, { key: 'assigned', width: 24 }, { key: 'center', width: 24 }, { key: 'total', width: 16 },
      { key: 'title', width: 38 }, { key: 'recordHours', width: 16 }, { key: 'work', width: 55 },
    ]
    sheet.mergeCells('A1:H1')
    const title = sheet.getCell('A1')
    title.value = 'REBIOS SL · REPORTE DE HORAS BORJAMOTOR'
    title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
    title.alignment = { horizontal: 'left', vertical: 'middle' }
    sheet.getRow(1).height = 30
    sheet.getCell('A2').value = 'Periodo'; sheet.getCell('B2').value = period;
    for (const cell of ['A2','B2','D2','E2','F2','G2']) {
      sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF5' } }
      sheet.getCell(cell).border = { top: { style: 'thin', color: { argb: 'FFD0D7DE' } }, bottom: { style: 'thin', color: { argb: 'FFD0D7DE' } }, left: { style: 'thin', color: { argb: 'FFD0D7DE' } }, right: { style: 'thin', color: { argb: 'FFD0D7DE' } } }
      sheet.getCell(cell).alignment = { vertical: 'middle' }
    }
    for (const cell of ['A2','D2','F2']) sheet.getCell(cell).font = { bold: true }
    sheet.getCell('E2').numFmt = '0'; sheet.getCell('G2').numFmt = '0.00'; sheet.getRow(2).height = 22
    sheet.addRow([])
    const header = sheet.addRow(['Fecha de creación','Nombre de la tarea','Usuario asignado','Centro de coste','Nº horas total','Título','Horas imputadas','Trabajo realizado'])
    header.height = 34
    header.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = { top: { style: 'thin', color: { argb: 'FFC8D0DA' } }, bottom: { style: 'thin', color: { argb: 'FFC8D0DA' } }, left: { style: 'thin', color: { argb: 'FFC8D0DA' } }, right: { style: 'thin', color: { argb: 'FFC8D0DA' } } } })
    for (const detail of details) {
      detail.taskRecords.forEach((record, index) => {
        const row = sheet.addRow([index === 0 ? date(detail.task.fecha_creacion) : '', index === 0 ? detail.task.nombre : '', index === 0 ? detail.creator?.nombre || 'Sin asignar' : '', index === 0 ? detail.centerName : '', index === 0 ? detail.hours : '', index === 0 ? detail.incident?.titulo || detail.task.descripcion || '' : '', Number(record.horas), record.comentario || 'Sin comentario'])
        row.height = 30
        row.eachCell(cell => { cell.alignment = { vertical: 'top', wrapText: true }; cell.border = { top: { style: 'thin', color: { argb: 'FFD7DDE5' } }, bottom: { style: 'thin', color: { argb: 'FFD7DDE5' } }, left: { style: 'thin', color: { argb: 'FFD7DDE5' } }, right: { style: 'thin', color: { argb: 'FFD7DDE5' } } } })
        if (row.number % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } } })
        row.getCell(5).numFmt = '0.00'; row.getCell(7).numFmt = '0.00'; row.getCell(5).alignment = { horizontal: 'right', vertical: 'top' }; row.getCell(7).alignment = { horizontal: 'right', vertical: 'top' }
      })
    }
    const totalRow = sheet.addRow([]); totalRow.height = 24; totalRow.getCell(1).value = 'TOTAL'; totalRow.getCell(1).font = { bold: true }; totalRow.getCell(5).value = totalHours; totalRow.getCell(5).numFmt = '0.00'; totalRow.getCell(5).font = { bold: true }
    for (let col = 1; col <= 8; col++) { const cell = totalRow.getCell(col); cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF5' } }; cell.border = { top: { style: 'thin', color: { argb: 'FFC8D0DA' } }, bottom: { style: 'thin', color: { argb: 'FFC8D0DA' } }, left: { style: 'thin', color: { argb: 'FFC8D0DE' } }, right: { style: 'thin', color: { argb: 'FFC8D0DE' } } } }
    totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }
    const summaryTitleRow = sheet.addRow([]); summaryTitleRow.height = 26; sheet.mergeCells(`A${summaryTitleRow.number}:H${summaryTitleRow.number}`); const summaryTitle = summaryTitleRow.getCell(1); summaryTitle.value = 'DESGLOSE DE HORAS POR CENTRO DE COSTE'; summaryTitle.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } }; summaryTitle.alignment = { vertical: 'middle' }
    sheet.addRow([])
    const summaryHeader = sheet.addRow(['Centro de coste','Horas']); summaryHeader.height = 26; summaryHeader.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; summaryHeader.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }; summaryHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } }; summaryHeader.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } }; summaryHeader.getCell(1).alignment = { vertical: 'middle' }; summaryHeader.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
    for (const [name, hours] of [...hoursByCenter.entries()].sort((a,b) => a[0].localeCompare(b[0], 'es'))) { const row = sheet.addRow([name, hours]); row.getCell(2).numFmt = '0.00'; row.getCell(2).alignment = { horizontal: 'right' }; row.eachCell(cell => { cell.border = { top: { style: 'thin', color: { argb: 'FFD7DDE5' } }, bottom: { style: 'thin', color: { argb: 'FFD7DDE5' } }, left: { style: 'thin', color: { argb: 'FFD7DDE5' } }, right: { style: 'thin', color: { argb: 'FFD7DDE5' } } } }) }
    const summaryTotal = sheet.addRow(['TOTAL', totalHours]); summaryTotal.getCell(1).font = { bold: true }; summaryTotal.getCell(2).font = { bold: true }; summaryTotal.getCell(2).numFmt = '0.00'; summaryTotal.getCell(2).alignment = { horizontal: 'right' }; summaryTotal.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF5' } }; cell.border = { top: { style: 'thin', color: { argb: 'FFC8D0DA' } }, bottom: { style: 'thin', color: { argb: 'FFC8D0DA' } }, left: { style: 'thin', color: { argb: 'FFC8D0DA' } }, right: { style: 'thin', color: { argb: 'FFC8D0DA' } } } })
    const headerRowNumber = header.number
    const firstDataRow = headerRowNumber + 1
    const lastDataRow = Math.max(firstDataRow, totalRow.number - 1)
    sheet.autoFilter = `A${headerRowNumber}:H${lastDataRow}`
    sheet.pageSetup.printArea = `A1:H${summaryTotal.number}`
    sheet.pageSetup.fitToWidth = 1
    sheet.pageSetup.fitToHeight = 0
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="reporte_tasker_${month}.xlsx"`, 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error exportando Tasker:', error)
    return NextResponse.json({ error: 'No se pudo generar el Excel.' }, { status: 500 })
  }
}
