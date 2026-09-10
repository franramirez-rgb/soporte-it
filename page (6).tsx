import Link from 'next/link'

export default function Pendiente() {
  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-logo"><span className="auth-logo-mark">⏳</span><span>REBIOS IT</span></div>
      <h1 className="auth-title">Cuenta pendiente</h1>
      <p className="auth-subtitle">Tu correo ya ha sido verificado, pero IT todavía debe autorizar tu acceso al portal.</p>
      <div className="notice info">Cuando administración active la cuenta podrás entrar normalmente con tus credenciales.</div>
      <Link className="btn btn-primary" href="/login" style={{ marginTop: 16 }}>Volver al login</Link>
    </section>
  </main>
}
