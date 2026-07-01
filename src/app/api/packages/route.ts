import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('tutor_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return NextResponse.json({ packages: packages ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, lessons_count, price } = await req.json()
  if (!name || !lessons_count || !price) {
    return NextResponse.json({ error: 'name, lessons_count, price required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('packages')
    .insert({ tutor_id: user.id, name, description, lessons_count: Number(lessons_count), price: Number(price) })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ package: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabase.from('packages').update({ active: false }).eq('id', id).eq('tutor_id', user.id)
  return NextResponse.json({ ok: true })
}
