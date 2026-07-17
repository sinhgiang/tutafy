import { requireFeature } from '@/lib/guard'
import { ImportTool } from './ImportTool'

export default async function ImportPage() {
  const locked = await requireFeature('pro', 'Import Students')
  if (locked) return locked

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Import Students</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Migrate your students and lesson history from Preply, iTalki, or any CSV file
        </p>
      </div>
      <ImportTool />
    </div>
  )
}
