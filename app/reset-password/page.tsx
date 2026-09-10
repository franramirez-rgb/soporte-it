'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (password.length < 8 || password !== confirm) { setError('La contraseña debe tener al menos 8 caracteres y coincidir.'); return }
    const { error: updateError } = await createClient().auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else setOk(true)
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-logo"><span className="auth-logo-mark">🔐</span><span>REBIOS IT</span></div>
      <h1 className="auth-title">Nueva contraseña</h1>
      <p className="auth-subtitle">Establece una nueva contraseña para tu cuenta.</p>
      {error && <div className="notice error" style={{ marginBottom: 14 }}>{error}</div>}
      {ok ? <div className="stack"><div className="notice success">Contraseña actualizada correctamente.</div><Link className="btn btn-primary" href="/dashboard">Entrar al portal</Link></div> : <form className="stack" onSubmit={submit}>
        <label className="stack small"><strong>Nueva contraseña</strong><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <label className="stack small"><strong>Repite la contraseña</strong><input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <button className="btn btn-primary">Guardar contraseña</button>
      </form>}
    </section>
  </main>
}
