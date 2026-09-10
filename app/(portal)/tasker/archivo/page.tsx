import { redirect } from 'next/navigation'

export default async function TaskerArchive({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>
}) {
  const params = await searchParams
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month! : new Date().toISOString().slice(0, 7)
  const page = Math.max(1, Number(params.page || 1))

  redirect(`/tasker?month=${encodeURIComponent(month)}&page=${page}&vista=archivo`)
}
