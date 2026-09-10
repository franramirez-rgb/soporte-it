tsx
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'controller' | 'empleado' | 'auditor'

/**
 * Obtiene el contexto autenticado una sola vez por render.
 *
 * React cache() evita que varios Server Components que llamen
 * a requireUser()/requireRole() vuelvan a ejecutar las mismas
 * consultas durante la misma navegación.
 */
export const getContext = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('usuarios')
    .select(
      [
        'id',
        'auth_user_id',
        'nombre',
        'email',
        'rol',
        'estado_cuenta',
        'centro_coste_id',
        'puesto',
        'departamento',
        'estado_material',
      ].join(','),
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error obteniendo perfil de usuario:', error)
    return {
      supabase,
      user,
      profile: null,
    }
  }

  return {
    supabase,
    user,
    profile: profile ?? null,
  }
})

/**
 * Exige que exista un usuario autenticado y activo.
 */
export const requireUser = cache(async () => {
  const ctx = await getContext()

  if (!ctx?.user || !ctx.profile) {
    redirect('/login')
  }

  if (ctx.profile.estado_cuenta !== 'activo') {
    redirect('/pendiente')
  }

  return ctx
})

/**
 * Exige que el usuario tenga uno de los roles indicados.
 */
export const requireRole = cache(async (roles: AppRole[]) => {
  const ctx = await requireUser()

  if (!roles.includes(ctx.profile.rol as AppRole)) {
    redirect('/dashboard')
  }

  return ctx
})
