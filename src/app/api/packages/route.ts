// Lesson packages of the signed-in tutor (T-0825). A Pro feature: the plan is re-read from the database on every call (the page's lock
// only hides the screen), the tutor id is the session's, and what a new package may be is checked by validatePackage.
import { NextRequest, NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'
import { isUuid } from '@/lib/list-params'
import { validatePackage } from '@/lib/business-lists'

export async function GET() {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const { data: packages } = await gate.supabase.from('packages').select('*').eq('tutor_id', gate.userId).eq('active', true).order('created_at', { ascending: false })
  return NextResponse.json({ packages: packages ?? [] })
}

export async function POST(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const body = await req.json().catch(() => null)
  const check = validatePackage(body)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const { data, error } = await gate.supabase.from('packages').insert({ tutor_id: gate.userId, ...check.value }).select().single()
  if (error) return NextResponse.json({ error: 'Could not save the package' }, { status: 500 })
  return NextResponse.json({ package: data })
}

export async function DELETE(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const id = req.nextUrl.searchParams.get('id')
  if (!isUuid(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data } = await gate.supabase.from('packages').update({ active: false }).eq('id', id).eq('tutor_id', gate.userId).select('id')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
