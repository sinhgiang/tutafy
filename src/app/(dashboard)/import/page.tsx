import { requireFeature } from '@/lib/guard'
import { ImportTool } from './ImportTool'

export default async function ImportPage() {
  const locked = await requireFeature('pro', 'Import Students')
  if (locked) return locked

  return (
    <div>
      <div className="dash-head">
        <div>
          <h1>Import students</h1>
          <p>Bring your students and lesson history from Preply, iTalki or any CSV file. You see exactly what will be added before anything is saved.</p>
        </div>
      </div>
      <ImportTool />
    </div>
  )
}
