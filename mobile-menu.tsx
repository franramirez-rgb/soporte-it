'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type Role = 'admin' | 'controller' | 'empleado' | 'auditor'

export function MobileMenu({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const items = [
    ['🏠', 'Dashboard', '/dashboard', true],
    ['🎫', 'Incidencias', '/tickets', true],
    ['📋', 'Tasker', '/tasker', role === 'admin' || role === 'auditor'],
    ['💻', 'Inventario', '/material', role === 'admin' || role === 'controller' || role === 'auditor'],
    ['👥', 'Usuarios', '/usuarios', role === 'admin' || role === 'auditor'],
    ['📈', 'Estadísticas', '/stats', role === 'admin' || role === 'auditor'],
    ['🗑️', 'Papelera', '/papelera', role === 'admin' || role === 'auditor'],
    ['👤', 'Mi perfil', '/perfil', true],
  ] as const

  return <>
    <button type="button" className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menú">☰</button>
    {open && <div className="mobile-sheet" onClick={() => setOpen(false)}>
      <aside className="mobile-panel" onClick={event => event.stopPropagation()}>
        <div className="brand"><strong>REBIOS IT</strong><span>Portal interno de soporte</span></div>
        <nav className="nav">{items.filter(item => item[3]).map(([icon, label, href]) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''} onClick={() => setOpen(false)}><span className="nav-icon">{icon}</span>{label}</Link>)}</nav>
        <button type="button" className="btn btn-secondary" style={{ marginTop: 18, width: '100%' }} onClick={() => setOpen(false)}>Cerrar menú</button>
      </aside>
    </div>}
  </>
}
