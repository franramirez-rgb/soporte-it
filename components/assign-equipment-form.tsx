'use client'
import {useState} from 'react'
import {assignEquipment} from '@/app/actions'
export function AssignEquipmentForm({equipmentId,users}:{equipmentId:number;users:{id:number;nombre:string}[]}){const [value,setValue]=useState('');return <form action={async()=>{if(value)await assignEquipment(equipmentId,Number(value))}} className="row-actions"><select className="input" value={value} onChange={e=>setValue(e.target.value)} required><option value="">Asignar…</option>{users.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select><button className="btn btn-success" disabled={!value}>Asignar</button></form>}
