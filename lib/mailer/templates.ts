const esc = (value: string | number | null | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const br = (value: string) => esc(value).replace(/\r?\n/g, '<br>')

const legalNotice = () => `
<tr>
  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;color:#64748b;font-size:10px;line-height:1.6;text-align:left">
    <p style="margin:0 0 10px"><strong>AVISO LEGAL:</strong></p>
    <p style="margin:0 0 10px">En caso de haber recibido este mensaje por error, le rogamos que de forma inmediata, nos lo comunique mediante correo electrónico remitido a nuestra atención y proceda a su eliminación, así como a la de cualquier documento adjunto al mismo.</p>
    <p style="margin:0 0 10px">En cumplimiento de la <a href="https://www.boe.es/buscar/doc.php?id=BOE-A-2018-16673" style="color:#2563eb;text-decoration:none">Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales</a> y el Reglamento (UE) 2016/679, REBIOS SL pone en su conocimiento que esta información ha sido remitida por personal al servicio de la citada empresa con la finalidad de cumplimiento de las funciones de su competencia.</p>
    <p style="margin:0 0 10px">Ponemos en su conocimiento la posibilidad de ejercer sus derechos de acceso, rectificación, supresión, oposición, portabilidad de datos, limitación del tratamiento y olvido en los términos establecidos en la legislación vigente, que podrá hacer efectivos dirigiéndose por escrito a REBIOS SL, con dirección en Carretera de Ocaña, 56 03006 Alicante.</p>
    <p style="margin:0">Si desea dejar de recibir correos de esta lista, reenvíe este e-mail a <a href="mailto:protecciondedatos@rebios.info" style="color:#2563eb;text-decoration:none">protecciondedatos@rebios.info</a> con el asunto <strong>BAJA</strong>.</p>
  </td>
</tr>`

const layout = (title: string, body: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#334155">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f9;padding:35px 10px">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
<tr><td style="background:#1e293b;padding:24px;text-align:center"><div style="font-size:28px;line-height:1">🛠️</div><h1 style="margin:9px 0 0;color:#fff;font-size:21px">${esc(title)}</h1><p style="margin:6px 0 0;color:#cbd5e1;font-size:12px">REBIOS SL · Portal de Soporte IT</p></td></tr>
<tr><td style="padding:30px;font-size:14px;line-height:1.65">${body}</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 20px;text-align:center;color:#94a3b8;font-size:10px">Mensaje automático del Portal Interno de Soporte IT.</td></tr>
${legalNotice()}
</table></td></tr></table></body></html>`

const button = (label: string, url: string) => `<p style="text-align:center;margin:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${esc(label)}</a></p>`
const block = (html: string) => `<div style="background:#f8fafc;border-left:4px solid #2563eb;padding:14px;margin:18px 0">${html}</div>`

export function ticketCreatedAdminEmail(p: { id: number; title: string; description: string; userName: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Se ha registrado una nueva incidencia en el Portal de Soporte IT.</p>${block(`<p style="margin:0 0 6px"><strong>Código:</strong> ${esc(code)}</p><p style="margin:0 0 6px"><strong>Empleado:</strong> ${esc(p.userName)}</p><p style="margin:0 0 6px"><strong>Título:</strong> ${esc(p.title)}</p><p style="margin:0"><strong>Descripción:</strong><br>${br(p.description)}</p>`)}${button('Ver ticket', p.url)}`
  return { subject: `NUEVO TICKET [${code}] - ${p.title}`, html: layout(`Nueva incidencia ${code}`, body) }
}

export function registrationVerifiedAdminEmail(p: { name: string; email: string; url: string }) {
  const body = `<p>Un usuario ha verificado su correo y tiene una solicitud pendiente de aprobación.</p>${block(`<p style="margin:0 0 6px"><strong>Nombre:</strong> ${esc(p.name)}</p><p style="margin:0"><strong>Email:</strong> ${esc(p.email)}</p>`)}${button('Revisar solicitud', p.url)}`
  return { subject: `Solicitud de registro: ${p.name}`, html: layout('Nueva solicitud de registro', body) }
}

export function ticketCreatedUserEmail(p: { id: number; title: string; description: string; name: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Hola <strong>${esc(p.name)}</strong>,</p><p>Hemos recibido correctamente tu incidencia y le hemos asignado el código <strong>${esc(code)}</strong>.</p>${block(`<p style="margin:0 0 6px"><strong>Asunto:</strong> ${esc(p.title)}</p><p style="margin:0"><strong>Descripción:</strong><br>${br(p.description)}</p>`)}<p>Te avisaremos cuando Soporte IT empiece a trabajar en el caso.</p>${button('Ver mi ticket', p.url)}`
  return { subject: `[${code}] Incidencia registrada correctamente`, html: layout(`Incidencia registrada ${code}`, body) }
}

export function ticketInProcessUserEmail(p: { id: number; title: string; name: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Hola <strong>${esc(p.name)}</strong>,</p><p>El equipo de Soporte IT ha cambiado el estado de tu incidencia <strong>${esc(code)}</strong> (${esc(p.title)}) a <strong style="color:#92400e">EN PROCESO</strong>.</p><p>Un técnico ya está trabajando en la resolución.</p>${button('Seguir conversación', p.url)}`
  return { subject: `[${code}] Tu incidencia está en proceso`, html: layout(`Ticket en proceso ${code}`, body) }
}

export function ticketMessageEmail(p: { id: number; title: string; senderName: string; message: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Hay una nueva respuesta en la incidencia <strong>${esc(code)}</strong> (${esc(p.title)}).</p>${block(`<p style="margin:0 0 6px"><strong>${esc(p.senderName)}</strong></p><p style="margin:0">${br(p.message)}</p>`)}${button('Abrir conversación', p.url)}`
  return { subject: `Re: [${code}] ${p.title}`, html: layout(`Actualización en ${code}`, body) }
}

export function ticketClosedUserEmail(p: { id: number; title: string; name: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Hola <strong>${esc(p.name)}</strong>,</p><p>Tu incidencia <strong>${esc(code)}</strong> (${esc(p.title)}) ha sido marcada como <strong style="color:#166534">RESUELTA / CERRADA</strong>.</p><p>Si el problema persiste, puedes abrir una nueva incidencia desde el portal.</p>${button('Ver resumen', p.url)}`
  return { subject: `[${code}] Incidencia resuelta y cerrada`, html: layout(`Caso cerrado ${code}`, body) }
}

export function ticketReopenedUserEmail(p: { id: number; title: string; name: string; url: string }) {
  const code = `#INC-${String(p.id).padStart(3, '0')}`
  const body = `<p>Hola <strong>${esc(p.name)}</strong>,</p><p>La incidencia <strong>${esc(code)}</strong> (${esc(p.title)}) ha sido reabierta.</p>${button('Ver incidencia', p.url)}`
  return { subject: `[${code}] Incidencia reabierta`, html: layout(`Incidencia reabierta ${code}`, body) }
}

export function equipmentAssignedUserEmail(p: { name: string; type: string; brand: string; model: string; identifier: string; url: string }) {
  const body = `<p>Hola <strong>${esc(p.name)}</strong>,</p><p>Se ha registrado un nuevo equipo a tu nombre en el inventario IT.</p>${block(`<p style="margin:0 0 6px"><strong>Tipo:</strong> ${esc(p.type)}</p><p style="margin:0 0 6px"><strong>Equipo:</strong> ${esc(p.brand)} ${esc(p.model)}</p><p style="margin:0"><strong>Identificador:</strong> ${esc(p.identifier)}</p>`)}${button('Ver mi perfil', p.url)}`
  return { subject: `Equipo IT asignado: ${p.brand} ${p.model}`, html: layout('Nuevo equipo asignado', body) }
}
