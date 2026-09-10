'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
export function Sidebar({role}:{role:string}){
  const pathname=usePathname(); const items=[['📊','Dashboard','/dashboard',true],['🎫','Incidencias','/tickets',true],['📋','Tasker','/tasker',role==='admin'||role==='auditor'],['💻','Inventario','/material',role==='admin'||role==='controller'||role==='auditor'],['👥','Usuarios','/usuarios',role==='admin'||role==='auditor'],['📈','Estadísticas','/stats',role==='admin'||role==='auditor'],['🗑️','Papelera','/papelera',role==='admin'||role==='auditor'],['👤','Mi perfil','/perfil',true]] as const
  return <aside className="sidebar"><div className="brand"><strong>REBIOS IT</strong><span>Portal interno de soporte</span></div><nav className="nav">{items.filter(x=>x[3]).map(([icon,label,href])=><Link key={href} href={href} className={pathname.startsWith(href)?'active':''}><span>{icon}</span>{label}</Link>)}</nav></aside>
}
