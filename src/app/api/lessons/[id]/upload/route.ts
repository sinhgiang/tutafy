import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify tutor owns lesson
  const { data: lesson } = await supabase.from('lessons').select('id, tutor_id, materials').eq('id', lessonId).eq('tutor_id', user.id).single()
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })

  const adminSupabase = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${lessonId}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await adminSupabase.storage
    .from('lesson-materials')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    // Bucket might not exist — create it and retry
    await adminSupabase.storage.createBucket('lesson-materials', { public: true }).catch(() => {})
    const { error: retryError } = await adminSupabase.storage
      .from('lesson-materials')
      .upload(path, arrayBuffer, { contentType: file.type })
    if (retryError) return NextResponse.json({ error: 'Upload failed: ' + retryError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = adminSupabase.storage.from('lesson-materials').getPublicUrl(path)

  // Append to materials array
  const existing = Array.isArray(lesson.materials) ? lesson.materials : []
  const newMaterial = { name: file.name, url: publicUrl, type: file.type, size: file.size }
  await adminSupabase.from('lessons').update({ materials: [...existing, newMaterial] }).eq('id', lessonId)

  return NextResponse.json({ url: publicUrl, name: file.name })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const { data: lesson } = await supabase.from('lessons').select('id, materials').eq('id', lessonId).eq('tutor_id', user.id).single()
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = Array.isArray(lesson.materials) ? lesson.materials : []
  const updated = existing.filter((m: any) => m.url !== url)
  await supabase.from('lessons').update({ materials: updated }).eq('id', lessonId)

  return NextResponse.json({ ok: true })
}
