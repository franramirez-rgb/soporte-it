import { updateProfile } from '@/app/actions'
import { requireUser } from '@/lib/auth'

export default async function Perfil() {
  const { supabase, profile } = await requireUser()
  const { data: equipment = [] } = await supabase
    .from('equipos')
    .select('tipo,marca,modelo,identificador,estado_equipo')
    .eq('usuario_id', profile.id)
    .order('tipo')

  return <div className="stack">
    <div>
      <h1 style={{ margin: '0 0 4px' }}>Mi perfil</h1>
      <div className="muted">Datos personales y material asignado.</div>
    </div>

    <div className="card pad">
      <h2 style={{ marginTop: 0 }}>Datos personales</h2>
      <form action={updateProfile} className="form-grid">
        <label>Nombre
          <input className="input" name="nombre" defaultValue={profile.nombre} required />
        </label>
        <label>Correo
          <input className="input" type="email" name="email" defaultValue={profile.email} required />
        </label>
        <div className="full small muted">
          El cambio de correo lo gestiona Supabase Auth y puede requerir confirmación.
        </div>
        <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Guardar cambios</button>
      </form>
    </div>

    <div className="card pad">
      <h2 style={{ marginTop: 0 }}>Material asignado</h2>
      {equipment.length ? <div className="stack">
        {equipment.map((e: any) => <div className="message" key={e.identificador}>
          <strong>{String(e.tipo).toUpperCase()} · {e.marca} {e.modelo}</strong>
          <div className="small muted">S/N: {e.identificador} · {e.estado_equipo}</div>
        </div>)}
      </div> : <div className="empty">No tienes equipos asignados.</div>}
    </div>
  </div>
}
