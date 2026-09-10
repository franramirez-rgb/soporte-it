'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setMsg('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (authError) setError(authError.message)
    else setMsg('Cuenta creada. Revisa tu correo para verificarlo. Después quedará pendiente de aprobación por IT.')
    setBusy(false)
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-logo"><span className="auth-logo-mark">🛠️</span><span>REBIOS IT</span></div>
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-subtitle">Registro interno del Portal de Soporte IT.</p>
      {error && <div className="notice error" style={{ marginBottom: 14 }}>{error}</div>}
      {msg && <div className="notice success" style={{ marginBottom: 14 }}>{msg}</div>}
      <form className="stack" onSubmit={submit}>
        <label className="stack small"><strong>Nombre completo</strong><input className="input" value={name} onChange={e => setName(e.target.value)} required /></label>
        <label className="stack small"><strong>Correo corporativo</strong><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="stack small"><strong>Contraseña</strong><input className="input" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required /></label>
        <button className="btn btn-primary" style={{ minHeight: 44 }} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <div style={{ marginTop: 18, fontSize: 13 }}><Link href="/login" style={{ color: '#2563eb' }}>← Volver al login</Link></div>
    </section>
  </main>
}
