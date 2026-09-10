'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMsg('')
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })
    if (resetError) setError(resetError.message)
    else setMsg('Si el correo corresponde a una cuenta, recibirás las instrucciones para restablecer la contraseña.')
    setBusy(false)
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-logo"><span className="auth-logo-mark">🔐</span><span>REBIOS IT</span></div>
      <h1 className="auth-title">Recuperar contraseña</h1>
      <p className="auth-subtitle">La recuperación de contraseña la gestiona Supabase Auth.</p>
      {error && <div className="notice error" style={{ marginBottom: 14 }}>{error}</div>}
      {msg && <div className="notice success" style={{ marginBottom: 14 }}>{msg}</div>}
      <form className="stack" onSubmit={submit}>
        <label className="stack small"><strong>Correo corporativo</strong><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <button className="btn btn-primary" style={{ minHeight: 44 }} disabled={busy}>{busy ? 'Enviando…' : 'Enviar instrucciones'}</button>
      </form>
      <div style={{ marginTop: 18, fontSize: 13 }}><Link href="/login" style={{ color: '#2563eb' }}>← Volver al login</Link></div>
    </section>
  </main>
}
