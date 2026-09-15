import Link from 'next/link'
import { createEquipment, deleteEquipment, editEquipment, releaseEquipment } from '@/app/actions'
import { AssignEquipmentForm } from '@/components/assign-equipment-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'

export default async function Material({ searchParams }: { searchParams: Promise<{ page?: string; editar?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || 1))
  const editId = Math.max(0, Number(params.editar || 0))
  const pageSize = 25
  const { profile } = await requireUser()
  const supabase = createAdminClient()
  const staff = profile.rol === 'admin' || profile.rol === 'controller'

  const [{ data: itemsRaw, count }, { data: usersRaw }, { data: centersRaw }, { data: editingRaw }] = await Promise.all([
    supabase.from('equipos').select('id,tipo,marca,modelo,identificador,estado_equipo,observaciones,usuario_id,centro_coste_id', { count: 'exact' }).order('tipo').order('marca').range((page - 1) * pageSize, page * pageSize - 1),
    staff ? supabase.from('usuarios').select('id,nombre,email').eq('estado_cuenta', 'activo').order('nombre') : Promise.resolve({ data: [] as Array<{ id: number; nombre: string; email: string }> }),
    supabase.from('centros_coste').select('id,nombre').order('nombre'),
    editId > 0 ? supabase.from('equipos').select('id,tipo,marca,modelo,identificador,estado_equipo,observaciones,usuario_id,centro_coste_id').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const items = itemsRaw ?? []
  const itemUserIds = [...new Set(items.map(item => item.usuario_id).filter(Boolean))]
  const itemCenterIds = [...new Set(items.map(item => item.centro_coste_id).filter(Boolean))]
  const [{ data: itemUsersRaw }, { data: itemCentersRaw }] = await Promise.all([
    itemUserIds.length ? supabase.from('usuarios').select('id,nombre,centro_coste_id').in('id', itemUserIds) : Promise.resolve({ data: [] as Array<{id:number; nombre:string; centro_coste_id:number | null}> }),
    itemCenterIds.length ? supabase.from('centros_coste').select('id,nombre').in('id', itemCenterIds) : Promise.resolve({ data: [] as Array<{id:number; nombre:string}> }),
  ])
  const itemUserById = new Map((itemUsersRaw ?? []).map(user => [user.id, user]))
  const itemCenterById = new Map((itemCentersRaw ?? []).map(center => [center.id, center.nombre]))
  const users = usersRaw ?? []
  const centers = centersRaw ?? []
  const editingEquipment = editingRaw ?? null
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const query = (nextPage: number, editar?: number) => {
    const q = new URLSearchParams({ page: String(nextPage) })
    if (editar) q.set('editar', String(editar))
    return `/material?${q.toString()}`
  }

  const availableItems = items.filter(item => item.estado_equipo === 'en_stock' && !item.usuario_id)
  const groupedItems = new Map<string, typeof items>()
  for (const item of items) {
    if (item.estado_equipo === 'en_stock' && !item.usuario_id) continue
    const assignedUser = item.usuario_id ? itemUserById.get(item.usuario_id) : undefined
    const centerId = item.centro_coste_id ?? assignedUser?.centro_coste_id ?? null
    const centerName = centerId ? itemCenterById.get(centerId) || centers.find(center => center.id === centerId)?.nombre || 'Sin asignar' : 'Sin asignar'
    const list = groupedItems.get(centerName) ?? []
    list.push(item)
    groupedItems.set(centerName, list)
  }
  const groupedSections = [...groupedItems.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))

  const renderItemRow = (item: (typeof items)[number]) => {
    const itemUser = item.usuario_id ? itemUserById.get(item.usuario_id) : undefined
    const centerId = item.centro_coste_id ?? itemUser?.centro_coste_id ?? null
    const centerName = centerId ? itemCenterById.get(centerId) || centers.find(center => center.id === centerId)?.nombre || 'Sin asignar' : 'Sin asignar'
    return <tr key={item.id}>
      <td>{item.tipo}</td><td><strong>{item.marca} {item.modelo}</strong><div className="small muted truncate">{item.observaciones}</div></td><td><code>{item.identificador}</code></td><td>{itemUser?.nombre || 'Sin asignar'}</td><td>{centerName}</td>
      <td><span className={`badge ${item.estado_equipo === 'en_stock' ? 'green' : item.estado_equipo === 'asignado' ? 'blue' : item.estado_equipo === 'reparacion' ? 'amber' : 'red'}`}>{item.estado_equipo.replace('_', ' ')}</span></td>
      <td>{staff && <div className="row-actions"><Link className="btn btn-secondary btn-sm" href={query(page, item.id)}>Gestionar</Link>{item.usuario_id && <form action={releaseEquipment.bind(null, item.id, 'en_stock')}><button className="btn btn-warning btn-sm">Liberar</button></form>}<form action={deleteEquipment.bind(null, item.id)}><button className="btn btn-danger btn-sm">Borrar</button></form></div>}</td>
    </tr>
  }

  return <div className="stack">
    <div className="hero"><div><h1>Inventario</h1><p>Equipos, asignaciones y estado del material IT.</p></div><span className="badge blue">{count || 0} equipos</span></div>

    {staff && editingEquipment && <div className="card pad edit-panel">
      <div className="toolbar"><div><h2 className="section-title">Gestionar equipo</h2><p className="section-subtitle">{editingEquipment.marca} {editingEquipment.modelo}</p></div><Link className="btn btn-ghost" href={query(page)}>Cerrar</Link></div>
      <div className="grid g2">
        <form action={editEquipment} className="form-grid">
          <input type="hidden" name="id" value={editingEquipment.id} />
          <label>Tipo<select className="input" name="tipo" defaultValue={editingEquipment.tipo}><option value="portatil">Portátil</option><option value="movil">Móvil</option><option value="telefono">Teléfono</option><option value="periferico">Periférico</option><option value="otro">Otro</option></select></label>
          <label>Marca<input className="input" name="marca" defaultValue={editingEquipment.marca} required /></label>
          <label>Modelo<input className="input" name="modelo" defaultValue={editingEquipment.modelo} required /></label>
          <label>Identificador / S/N<input className="input" name="identificador" defaultValue={editingEquipment.identificador} required /></label>
          <label>Estado<select className="input" name="estado_equipo" defaultValue={editingEquipment.estado_equipo}><option value="en_stock">En stock</option><option value="asignado">Asignado</option><option value="reparacion">Reparación</option><option value="baja">Baja</option></select></label>
          <label className="full">Observaciones<textarea className="input" name="observaciones" rows={3} defaultValue={editingEquipment.observaciones || ''} /></label>
          <button className="btn btn-primary">Guardar cambios</button>
        </form>
        <div className="card muted-card pad">
          <div className="small muted" style={{ marginBottom: 8 }}>Asignación</div>
          {editingEquipment.usuario_id ? <><div><strong>Equipo asignado</strong></div><div className="small muted" style={{ marginTop: 4 }}>Usuario #{editingEquipment.usuario_id}</div><form action={releaseEquipment.bind(null, editingEquipment.id, 'en_stock')} style={{ marginTop: 12 }}><button className="btn btn-secondary">Liberar equipo</button></form></> : <AssignEquipmentForm equipmentId={editingEquipment.id} users={users as Array<{ id: number; nombre: string }>} />}
        </div>
      </div>
    </div>}

    {staff && !editingEquipment && <div className="card pad">
      <h2 className="section-title">Dar de alta equipo</h2>
      <form action={createEquipment} className="form-grid" style={{ marginTop: 14 }}>
        <label>Tipo<select className="input" name="tipo"><option value="portatil">Portátil</option><option value="movil">Móvil</option><option value="telefono">Teléfono</option><option value="periferico">Periférico</option><option value="otro">Otro</option></select></label>
        <label>Marca<input className="input" name="marca" required /></label><label>Modelo<input className="input" name="modelo" required /></label><label>Identificador / S/N<input className="input" name="identificador" required /></label>
        <label className="full">Observaciones<textarea className="input" name="observaciones" rows={3} /></label><button className="btn btn-primary full">Dar de alta</button>
      </form>
    </div>}

    {availableItems.length > 0 && <section className="stack">
      <div className="toolbar"><div><h2 className="section-title">Disponible</h2><p className="section-subtitle">Material en stock y sin asignar.</p></div><span className="badge green">{availableItems.length} disponibles</span></div>
      <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Tipo</th><th>Equipo</th><th>S/N</th><th>Usuario</th><th>Centro</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{availableItems.map(renderItemRow)}</tbody></table></div></div>
    </section>}

    {groupedSections.map(([centerName, centerItems]) => <section key={centerName} className="stack">
      <div className="toolbar"><div><h2 className="section-title">{centerName}</h2><p className="section-subtitle">Material asociado a este centro.</p></div><span className="badge blue">{centerItems.length} equipos</span></div>
      <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Tipo</th><th>Equipo</th><th>S/N</th><th>Usuario</th><th>Centro</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{centerItems.map(renderItemRow)}</tbody></table></div></div>
    </section>)}

    {!items.length && <div className="card"><div className="empty">No hay equipos registrados.</div></div>}

    {totalPages > 1 && <div className="pagination"><Link className="btn btn-secondary" href={query(Math.max(1, page - 1))}>Anterior</Link><span className="small muted">Página {page} de {totalPages}</span><Link className="btn btn-secondary" href={query(Math.min(totalPages, page + 1))}>Siguiente</Link></div>}
  </div>
}
