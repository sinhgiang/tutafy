'use client'
import { useRef, useState } from 'react'
import { Paperclip, X, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface Material { name: string; url: string; type: string; size: number }

export function MaterialUpload({ lessonId, materials, onUpdate }: {
  lessonId: string
  materials: Material[]
  onUpdate: (materials: Material[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/lessons/${lessonId}/upload`, { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)
    e.target.value = ''
    if (res.ok) {
      toast.success('File uploaded')
      onUpdate([...materials, { name: data.name, url: data.url, type: file.type, size: file.size }])
    } else {
      toast.error(data.error ?? 'Upload failed')
    }
  }

  async function handleDelete(url: string) {
    const res = await fetch(`/api/lessons/${lessonId}/upload`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    if (res.ok) {
      toast.success('Removed')
      onUpdate(materials.filter(m => m.url !== url))
    }
  }

  return (
    <div className="space-y-2">
      {materials.map((m) => (
        <div key={m.url} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Paperclip className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <a href={m.url} target="_blank" rel="noopener noreferrer"
            className="text-[13px] text-indigo-600 hover:underline flex-1 truncate">{m.name}</a>
          <button onClick={() => handleDelete(m.url)} className="text-gray-300 hover:text-red-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors">
        <Upload className="h-3.5 w-3.5" />
        {uploading ? 'Uploading...' : 'Attach file'}
      </button>
    </div>
  )
}
