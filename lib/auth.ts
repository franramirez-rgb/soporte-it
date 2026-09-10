import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'controller' | 'empleado' | 'auditor'

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

type AuthIdentity = {
  id: string
  email?: string
}

/**
 * Verifica la identidad con el JWT ya validado por el proxy.
 * getClaims evita el getUser remoto para cada navegación cuando
 * el proyecto usa firmas JWT asimétricas.
 */
export const getContext = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub || typeof data.claims.sub !== 'string') {
    return null
  }

  const identity: AuthIdentity = {
    id: data.claims.sub,
    email: typeof data.claims.email === 'string' ? data.claims.email : undefined,
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('id,auth_user_id,nombre,email,rol,estado_cuenta,centro_coste_id,puesto,departamento,estado_material')
    .eq('auth_user_id', identity.id)
    .maybeSingle()

  if (profileError || !profile) {
    return {
      supabase,
      user: identity,
      profile: null,
    }
  }

  return {
    supabase,
    user: identity,
    profile: profile as UserProfile,
  }
})

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

export const requireRole = cache(async (roles: AppRole[]) => {
  const ctx = await requireUser()

  if (!roles.includes(ctx.profile.rol)) {
    redirect('/dashboard')
  }

  return ctx
})
