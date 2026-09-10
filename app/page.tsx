import {getContext} from '@/lib/auth'
import {redirect} from 'next/navigation'
export default async function Home(){const ctx=await getContext();redirect(ctx?.user?'/dashboard':'/login')}
