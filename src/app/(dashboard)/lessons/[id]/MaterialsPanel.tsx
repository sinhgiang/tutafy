'use client'
import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { MaterialUpload } from '@/components/MaterialUpload'

interface Material { name: string; url: string; type: string; size: number }

export function MaterialsPanel({ lessonId, initialMaterials }: {
  lessonId: string
  initialMaterials: Material[]
}) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-gray-400" />
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Materials</p>
      </div>
      <MaterialUpload lessonId={lessonId} materials={materials} onUpdate={setMaterials} />
    </div>
  )
}
