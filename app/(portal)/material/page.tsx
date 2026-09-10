import Link from 'next/link'
import { createEquipment, deleteEquipment, editEquipment, releaseEquipment } from '@/app/actions'
import { AssignEquipmentForm } from '@/components/assign-equipment-form'
import { requireUser } from '@/lib/auth'

export default async function Material({ searchParams }: { searchParams: Promise<{ page?: string; editar?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || 1))
  const editId = Math.max(0, Number(params.editar || 0))
  const pageSize = 25
  const { supabase, profile } = await requireUser()
  const staff = profile.rol === 'admin' || profile.rol === 'controller'

  const [{ data: itemsRaw, count }, { data: usersRaw }, { data: editingRaw }] = await Promise.all([
    supabase.from('equipos').select('id,tipo,marca,modelo,identificador,estado_equipo,observaciones,usuario_id,usuarios:usuario_id(nombre),centros:centro_coste_id(nombre)', { count: 'exact' }).order('tipo').order('marca').range((page - 1) * pageSize, page * pageSize - 1),
    staff ? supabase.from('usuarios').select('id,nombre,email').eq('estado_cuenta', 'activo').order('nombre') : Promise.resolve({ data: [] as Array<{ id: number; nombre: string; email: string }> }),
    editId > 0 ? supabase.from('equipos').select('id,tipo,marca,modelo,identificador,estado_equipo,observaciones,usuario_id,centro_coste_id').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const items = itemsRaw ?? []
  const users = usersRaw ?? []
  const editingEquipment = editingRaw ?? null
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const query = (nextPage: number, editar?: number) => {
    const q = new URLSearchParams({ page: String(nextPage) })
    if (editar) q.set('editar', String(editar))
    return `/material?${q.toString()}`
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

    <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Tipo</th><th>Equipo</th><th>S/N</th><th>Usuario</th><th>Centro</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {items.map(item => <tr key={item.id}>
        <td>{item.tipo}</td><td><strong>{item.marca} {item.modelo}</strong><div className="small muted truncate">{item.observaciones}</div></td><td><code>{item.identificador}</code></td><td>{item.usuarios?.[0]?.nombre || 'Sin asignar'}</td><td>{item.centros?.[0]?.nombre || 'Sin asignar'}</td>
        <td><span className={`badge ${item.estado_equipo === 'en_stock' ? 'green' : item.estado_equipo === 'asignado' ? 'blue' : item.estado_equipo === 'reparacion' ? 'amber' : 'red'}`}>{item.estado_equipo.replace('_', ' ')}</span></td>
        <td>{staff && <div className="row-actions"><Link className="btn btn-secondary btn-sm" href={query(page, item.id)}>Gestionar</Link>{item.usuario_id && <form action={releaseEquipment.bind(null, item.id, 'en_stock')}><button className="btn btn-warning btn-sm">Liberar</button></form>}<form action={deleteEquipment.bind(null, item.id)}><button className="btn btn-danger btn-sm">Borrar</button></form></div>}</td>
      </tr>)}
    </tbody></table>{!items.length && <div className="empty">No hay equipos registrados.</div>}</div></div>

    {totalPages > 1 && <div className="pagination"><Link className="btn btn-secondary" href={query(Math.max(1, page - 1))}>Anterior</Link><span className="small muted">Página {page} de {totalPages}</span><Link className="btn btn-secondary" href={query(Math.min(totalPages, page + 1))}>Siguiente</Link></div>}
  </div>
}
