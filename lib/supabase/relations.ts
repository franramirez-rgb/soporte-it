/**
 * Normaliza una relación embebida de Supabase/PostgREST.
 * Las relaciones many-to-one se reciben normalmente como objeto, mientras
 * que algunos tipados/configuraciones pueden representarlas como array.
 */
export function oneRelation<T>(value: T[] | null | undefined): T | null
export function oneRelation<T>(value: T | null | undefined): T | null
export function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
