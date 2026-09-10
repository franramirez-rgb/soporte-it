import {requireUser} from '@/lib/auth'
import {Sidebar} from '@/components/sidebar'
import {SignOutButton} from '@/components/sign-out-button'
import {MobileMenu} from '@/components/mobile-menu'
import {NotificationBell} from '@/components/notification-bell'
export const dynamic='force-dynamic'
export default async function PortalLayout({children}:{children:React.ReactNode}){
 const {profile}=await requireUser();
 return <div className="shell"><Sidebar role={profile.rol}/><main className="main"><header className="topbar"><div style={{display:'flex',alignItems:'center',gap:12}}><MobileMenu role={profile.rol as any}/><div><span className="topbar-title">Portal de Soporte IT</span><span className="small muted" style={{display:'block'}}>REBIOS SL · Gestión interna</span></div></div><div className="topbar-user"><NotificationBell userId={profile.id}/><span>{profile.nombre} · {profile.rol.toUpperCase()}</span><SignOutButton/></div></header><section className="content">{children}</section></main></div>
}
