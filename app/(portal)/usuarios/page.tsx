import Link from 'next/link'
import { approveUser, createUserManual, deleteUser, importUsersCsv, inviteExistingUser, rejectUser, updateUser } from '@/app/actions'
import { DeleteUserButton } from '@/components/delete-user-button'
import { requireRole } from '@/lib/auth'
import { oneRelation } from '@/lib/supabase/relations'

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ page?: string; editar?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || 1))
  const editId = Math.max(0, Number(params.editar || 0))
  const pageSize = 25
  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const admin = profile.rol === 'admin'

  const [{ data: usersRaw, count }, { data: centersRaw }, { data: editingRaw }] = await Promise.all([
    supabase.from('usuarios').select('id,nombre,email,rol,estado_cuenta,auth_user_id,centros:centro_coste_id(nombre),puesto,departamento,centro_coste_id', { count: 'exact' }).order('nombre').range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from('centros_coste').select('id,nombre').order('nombre'),
    editId > 0 ? supabase.from('usuarios').select('id,nombre,email,rol,estado_cuenta,puesto,departamento,centro_coste_id').eq('id', editId).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const users = usersRaw ?? []
  const centers = centersRaw ?? []
  const editingUser = editingRaw ?? null
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const query = (nextPage: number, editar?: number) => {
    const q = new URLSearchParams({ page: String(nextPage) })
    if (editar) q.set('editar', String(editar))
    return `/usuarios?${q.toString()}`
  }

  return <div className="stack">
    <div className="hero"><div><h1>Usuarios</h1><p>Accesos, roles, departamentos y centros de coste.</p></div><span className="badge blue">{count || 0} usuarios</span></div>

    {admin && editingUser && <div className="card pad edit-panel">
      <div className="toolbar"><div><h2 className="section-title">Editar usuario</h2><p className="section-subtitle">Actualiza los datos de la cuenta.</p></div><Link className="btn btn-ghost" href={query(page)}>Cerrar</Link></div>
      <form action={updateUser} className="form-grid">
        <input type="hidden" name="id" value={editingUser.id} />
        <label>Nombre<input className="input" name="nombre" defaultValue={editingUser.nombre} required /></label><label>Email<input className="input" type="email" name="email" defaultValue={editingUser.email} required /></label>
        <label>Rol<select className="input" name="rol" defaultValue={editingUser.rol}><option>empleado</option><option>controller</option><option>auditor</option><option>admin</option></select></label>
        <label>Centro<select className="input" name="centro_coste_id" defaultValue={editingUser.centro_coste_id || ''}><option value="">Sin asignar</option>{centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}</select></label>
        <label>Puesto<input className="input" name="puesto" defaultValue={editingUser.puesto || ''} /></label><label>Departamento<input className="input" name="departamento" defaultValue={editingUser.departamento || ''} /></label>
        <button className="btn btn-primary">Guardar cambios</button>
      </form>
    </div>}

    {admin && !editingUser && <div className="grid g2">
      <div className="card pad"><h2 className="section-title">Alta manual</h2><form action={createUserManual} className="form-grid" style={{ marginTop: 14 }}>
        <label>Nombre<input className="input" name="nombre" required /></label><label>Email<input className="input" type="email" name="email" required /></label><label>Contraseña<input className="input" type="password" name="password" minLength={8} required /></label><label>Rol<select className="input" name="rol" defaultValue="empleado"><option>empleado</option><option>controller</option><option>auditor</option><option>admin</option></select></label>
        <label>Centro<select className="input" name="centro_coste_id"><option value="">Sin asignar</option>{centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}</select></label><label>Puesto<input className="input" name="puesto" /></label><label>Departamento<input className="input" name="departamento" /></label><button className="btn btn-primary full">Crear usuario</button>
      </form></div>
      <div className="card pad"><h2 className="section-title">Importación CSV</h2><form action={importUsersCsv} className="stack" encType="multipart/form-data" style={{ marginTop: 14 }}><input className="input" type="file" name="archivo_csv" accept=".csv,text/csv" required /><div className="notice info">Nombre;Correo;Centro_Coste;Puesto;Departamento;Rol;Password;Tipo_Equipo;Marca;Modelo;Identificador_SN</div><button className="btn btn-secondary">Importar CSV</button></form></div>
    </div>}

    <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Usuario</th><th>Rol</th><th>Centro de coste</th><th>Estado</th><th>Auth</th><th>Acciones</th></tr></thead><tbody>
      {users.map(user => <tr key={user.id}>
        <td><strong>{user.nombre}</strong><div className="small muted">{user.email}</div><div className="small muted">{user.puesto || 'Sin puesto'}{user.departamento ? ` · ${user.departamento}` : ''}</div></td><td><span className="badge slate">{user.rol}</span></td><td>{oneRelation(user.centros)?.nombre || '—'}</td>
        <td><span className={`badge ${user.estado_cuenta === 'activo' ? 'green' : user.estado_cuenta === 'pendiente' ? 'amber' : 'slate'}`}>{user.estado_cuenta}</span></td><td>{user.auth_user_id ? <span className="badge green">vinculado</span> : <span className="badge amber">sin acceso</span>}</td>
        <td>{admin && <div className="row-actions"><Link className="btn btn-secondary btn-sm" href={query(page, user.id)}>Editar</Link>{user.estado_cuenta === 'pendiente' && <><form action={approveUser.bind(null, user.id)}><button className="btn btn-success btn-sm">Autorizar</button></form><form action={rejectUser.bind(null, user.id)}><button className="btn btn-danger btn-sm">Rechazar</button></form></>}{!user.auth_user_id && <form action={inviteExistingUser.bind(null, user.id)}><button className="btn btn-primary btn-sm">Invitar</button></form>}{user.id !== profile.id && <DeleteUserButton action={deleteUser.bind(null, user.id)} userName={user.nombre} />}</div>}</td>
      </tr>)}
    </tbody></table>{!users.length && <div className="empty">No hay usuarios.</div>}</div></div>

    {totalPages > 1 && <div className="pagination"><Link className="btn btn-secondary" href={query(Math.max(1, page - 1))}>Anterior</Link><span className="small muted">Página {page} de {totalPages}</span><Link className="btn btn-secondary" href={query(Math.min(totalPages, page + 1))}>Siguiente</Link></div>}
  </div>
}
