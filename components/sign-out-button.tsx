'use client'
import {createClient} from '@/lib/supabase/client'
export function SignOutButton(){return <button className="btn btn-secondary" onClick={async()=>{const supabase=createClient();await supabase.auth.signOut();window.location.href='/login'}}>Cerrar sesión</button>}
