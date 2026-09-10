import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

// Solo refrescamos la sesión en rutas que realmente necesitan Supabase.
// Evita ejecutar getClaims() en login, registro, páginas públicas y assets.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tickets/:path*',
    '/tasker/:path*',
    '/material/:path*',
    '/usuarios/:path*',
    '/stats/:path*',
    '/papelera/:path*',
    '/perfil/:path*',
    '/pendiente',
    '/api/:path*',
    '/auth/:path*',
  ],
}
