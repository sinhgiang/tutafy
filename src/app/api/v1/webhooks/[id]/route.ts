import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabase/server'

// DELETE /api/v1/webhooks/:id — unsubscribe (Zapier REST-hook unsubscribe).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('webhook_subscriptions')
    .delete()
    .eq('id', id)
    .eq('tutor_id', caller.tutorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
