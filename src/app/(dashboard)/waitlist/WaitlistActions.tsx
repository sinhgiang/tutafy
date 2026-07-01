'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export function WaitlistActions({ entryId }: { entryId: string }) {
  const [deleted, setDeleted] = useState(false)

  async function remove() {
    await fetch('/api/waitlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId }),
    })
    setDeleted(true)
  }

  if (deleted) return null

  return (
    <button onClick={remove}
      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
