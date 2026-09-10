import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export type AppRole='admin'|'controller'|'empleado'|'auditor'
export async function getContext(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return null
  const {data:profile}=await supabase.from('usuarios').select('id,auth_user_id,nombre,email,rol,estado_cuenta,centro_coste_id,puesto,departamento,estado_material').eq('auth_user_id',user.id).maybeSingle()
  return profile?{supabase,user,profile}:{supabase,user,profile:null}
}
export async function requireUser(){const ctx=await getContext(); if(!ctx?.user||!ctx.profile) redirect('/login'); if(ctx.profile.estado_cuenta!=='activo') redirect('/pendiente'); return ctx}
export async function requireRole(roles:AppRole[]){const ctx=await requireUser(); if(!roles.includes(ctx.profile.rol as AppRole)) redirect('/dashboard'); return ctx}
