import { approveUser, createUserManual, importUsersCsv, inviteExistingUser, rejectUser, updateUser } from '@/app/actions'
import { requireRole } from '@/lib/auth'

export default async function Usuarios() {
  const { supabase, profile } = await requireRole(['admin', 'auditor'])
  const [{ data: users }, { data: centers }] = await Promise.all([
    supabase.from('usuarios').select('id,nombre,email,rol,estado_cuenta,auth_user_id,centros:centro_coste_id(nombre),puesto,departamento,centro_coste_id').order('nombre'),
    supabase.from('centros_coste').select('id,nombre').order('nombre'),
  ])
  const safeUsers = users ?? []
  const safeCenters = centers ?? []
  const admin = profile.rol === 'admin'
  return <div className="stack">
    <div className="hero"><div><h1>Usuarios</h1><p>Accesos, roles, departamentos y centros de coste.</p></div><div className="toolbar-right"><span className="badge blue">{safeUsers.length} usuarios</span></div></div>

    {admin && <div className="grid g2">
      <div className="card pad"><h2 className="section-title">Alta manual</h2><p className="section-subtitle">Crea una cuenta activa directamente en Supabase Auth.</p>
        <form action={createUserManual} className="form-grid" style={{marginTop:14}}>
          <label>Nombre<input className="input" name="nombre" required /></label><label>Email<input className="input" type="email" name="email" required /></label>
          <label>Contraseña<input className="input" type="password" name="password" minLength={8} required /></label><label>Rol<select className="input" name="rol" defaultValue="empleado"><option>empleado</option><option>controller</option><option>auditor</option><option>admin</option></select></label>
          <label>Centro<select className="input" name="centro_coste_id" defaultValue=""><option value="">Sin asignar</option>{safeCenters.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label>Puesto<input className="input" name="puesto" /></label><label>Departamento<input className="input" name="departamento" /></label>
          <button className="btn btn-primary full">Crear usuario</button>
        </form>
      </div>
      <div className="card pad"><h2 className="section-title">Importación CSV</h2><p className="section-subtitle">Usa el formato del portal anterior: usuario + datos opcionales del equipo.</p>
        <form action={importUsersCsv} className="stack" encType="multipart/form-data" style={{marginTop:14}}><input className="input" type="file" name="archivo_csv" accept=".csv,text/csv" required /><div className="notice info">Columnas: Nombre;Correo;Centro_Coste;Puesto;Departamento;Rol;Password;Tipo_Equipo;Marca;Modelo;Identificador_SN</div><button className="btn btn-secondary">Importar CSV</button></form>
      </div>
    </div>}

    <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Usuario</th><th>Rol</th><th>Centro</th><th>Estado</th><th>Auth</th><th>Acciones</th></tr></thead><tbody>
      {safeUsers.map((u:any)=><tr key={u.id}>
        <td><strong>{u.nombre}</strong><div className="small muted">{u.email}</div><div className="small muted">{u.puesto || 'Sin puesto'}{u.departamento ? ` · ${u.departamento}` : ''}</div></td>
        <td><span className="badge slate">{u.rol}</span></td><td>{u.centros?.nombre || '—'}</td>
        <td><span className={`badge ${u.estado_cuenta==='activo'?'green':u.estado_cuenta==='pendiente'?'amber':'slate'}`}>{u.estado_cuenta}</span></td>
        <td>{u.auth_user_id ? <span className="badge green">vinculado</span> : <span className="badge amber">sin acceso</span>}</td>
        <td>{admin && <div className="row-actions">
          {u.estado_cuenta==='pendiente' && <><form action={approveUser.bind(null,u.id)}><button className="btn btn-success btn-sm">Autorizar</button></form><form action={rejectUser.bind(null,u.id)}><button className="btn btn-danger btn-sm">Rechazar</button></form></>}
          {!u.auth_user_id && <form action={inviteExistingUser.bind(null,u.id)}><button className="btn btn-primary btn-sm">Invitar</button></form>}
          <details><summary className="btn btn-secondary btn-sm">Editar</summary><form action={updateUser} className="stack" style={{marginTop:8,minWidth:280}}><input type="hidden" name="id" value={u.id}/><input className="input" name="nombre" defaultValue={u.nombre} required/><input className="input" type="email" name="email" defaultValue={u.email} required/><select className="input" name="rol" defaultValue={u.rol}><option>empleado</option><option>controller</option><option>auditor</option><option>admin</option></select><select className="input" name="centro_coste_id" defaultValue={u.centro_coste_id || ''}><option value="">Sin asignar</option>{safeCenters.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select><input className="input" name="puesto" defaultValue={u.puesto || ''}/><input className="input" name="departamento" defaultValue={u.departamento || ''}/><button className="btn btn-primary">Guardar</button></form></details>
        </div>}</td>
      </tr>)}
    </tbody></table>{!safeUsers.length&&<div className="empty">No hay usuarios.</div>}</div></div>
  </div>
}
