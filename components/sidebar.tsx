'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  RotateCcw,
  Ticket,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'

type Role = 'admin' | 'controller' | 'empleado' | 'auditor'

type NavItem = {
  icon: LucideIcon
  label: string
  href: string
  visible: boolean
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()

  const items: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', visible: true },
    { icon: Ticket, label: 'Incidencias', href: '/tickets', visible: true },
    { icon: ClipboardList, label: 'Tasker', href: '/tasker', visible: role === 'admin' || role === 'auditor' },
    { icon: Package, label: 'Inventario', href: '/material', visible: role === 'admin' || role === 'controller' || role === 'auditor' },
    { icon: UsersRound, label: 'Usuarios', href: '/usuarios', visible: role === 'admin' || role === 'auditor' },
    { icon: BarChart3, label: 'Estadísticas', href: '/stats', visible: role === 'admin' || role === 'auditor' },
    { icon: Trash2, label: 'Papelera', href: '/papelera', visible: role === 'admin' || role === 'auditor' },
    { icon: UserRound, label: 'Mi perfil', href: '/perfil', visible: true },
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>REBIOS IT</strong>
        <span>Portal interno de soporte</span>
      </div>

      <nav className="nav" aria-label="Principal">
        {items.filter(item => item.visible).map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className={pathname.startsWith(href) ? 'active' : ''}
          >
            <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
