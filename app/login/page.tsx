'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) {
      setError('El correo o la contraseña no son correctos.')
      setBusy(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-logo"><span className="auth-logo-mark">🛠️</span><span>REBIOS IT</span></div>
      <h1 className="auth-title">Iniciar sesión</h1>
      <p className="auth-subtitle">Accede al portal interno de soporte y gestión IT.</p>
      {error && <div className="notice error" style={{ marginBottom: 14 }}>{error}</div>}
      <form className="stack" onSubmit={submit}>
        <label className="stack small"><strong>Correo corporativo</strong><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label className="stack small"><strong>Contraseña</strong><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <button className="btn btn-primary" style={{ minHeight: 44 }} disabled={busy}>{busy ? 'Entrando…' : 'Entrar al portal'}</button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 18, fontSize: 13 }}>
        <Link href="/register" style={{ color: '#2563eb', fontWeight: 650 }}>Crear cuenta</Link>
        <Link href="/forgot-password" style={{ color: '#64748b' }}>¿Has olvidado la contraseña?</Link>
      </div>
      <div className="auth-footer">Uso interno · REBIOS SL</div>
    </section>
  </main>
}
