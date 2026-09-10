import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole =
  | 'admin'
  | 'controller'
  | 'empleado'
  | 'auditor'

export type UserProfile = {
  id: number
  auth_user_id: string
  nombre: string
  email: string
  rol: AppRole
  estado_cuenta: string
  centro_coste_id: number | null
  puesto: string | null
  departamento: string | null
  estado_material: string | null
}

/**
 * Obtiene el usuario autenticado y su perfil.
 *
 * cache() evita repetir la misma consulta cuando varios
 * Server Components necesitan el contexto del usuario
 * durante la misma navegación/renderizado.
 */
export const getContext = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select(
      'id,auth_user_id,nombre,email,rol,estado_cuenta,centro_coste_id,puesto,departamento,estado_material',
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    if (profileError) {
      console.error(
        'Error obteniendo perfil de usuario:',
        profileError,
      )
    }

    return {
      supabase,
      user,
      profile: null,
    }
  }

  return {
    supabase,
    user,
    profile: profile as UserProfile,
  }
})

/**
 * Requiere un usuario autenticado y con cuenta activa.
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
 * Requiere que el usuario tenga uno de los roles indicados.
 */
export const requireRole = cache(async (roles: AppRole[]) => {
  const ctx = await requireUser()

  if (!roles.includes(ctx.profile.rol)) {
    redirect('/dashboard')
  }

  return ctx
})