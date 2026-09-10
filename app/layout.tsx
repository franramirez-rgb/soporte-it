import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:'Portal de Soporte IT — REBIOS SL',
  description:'Portal interno de incidencias, tareas y material IT'
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="es"><body>{children}</body></html>
}
