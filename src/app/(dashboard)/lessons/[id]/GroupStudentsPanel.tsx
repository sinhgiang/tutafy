'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'

type Student = { id: string; name: string; email?: string }
type GroupEntry = {
  id: string
  price: number | null
  payment_status: string
  students: Student
}

export function GroupStudentsPanel({
  lessonId,
  allStudents,
}: {
  lessonId: string
  allStudents: Student[]
}) {
  const [entries, setEntries] = useState<GroupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/group-students`)
      .then(r => r.json())
      .then(data => {
        if (data.migrationRequired) {
          setMigrationRequired(true)
        } else {
          setEntries(data.students ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lessonId])

  async function addStudent() {
    if (!addStudentId) return
    setAdding(true)
    const res = await fetch(`/api/lessons/${lessonId}/group-students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: addStudentId,
        price: addPrice ? parseFloat(addPrice) : null,
      }),
    })
    const data = await res.json()
    if (res.ok && data.entry) {
      setEntries(prev => [...prev, data.entry])
      setAddStudentId('')
      setAddPrice('')
      setShowAdd(false)
    }
    setAdding(false)
  }

  async function removeEntry(entryId: string) {
    await fetch(`/api/lessons/${lessonId}/group-students?entry_id=${entryId}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  async function updatePayment(entryId: string, status: string) {
    await fetch(`/api/lessons/${lessonId}/group-students`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, payment_status: status }),
    })
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, payment_status: status } : e))
  }

  const alreadyAdded = new Set(entries.map(e => e.students.id))
  const available = allStudents.filter(s => !alreadyAdded.has(s.id))

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <Loader2 className="h-4 w-4 text-gray-300 animate-spin mx-auto" />
    </div>
  )

  if (migrationRequired) return (
    <div className="bg-white rounded-xl border border-amber-100 p-5">
      <p className="text-[13px] font-semibold text-amber-800">Database setup required</p>
      <p className="text-[12px] text-amber-600 mt-1">Run migration 007 in Supabase SQL Editor to enable Group Class features.</p>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          <p className="text-[13px] font-semibold text-gray-900">Group Students ({entries.length})</p>
        </div>
        {available.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-[12px] font-semibold text-indigo-500 hover:text-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add student
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
          <select
            value={addStudentId}
            onChange={e => setAddStudentId(e.target.value)}
            className="w-full text-[13px] px-3 py-2 rounded-lg border border-indigo-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select student...</option>
            {available.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Price (optional)"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value)}
              className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-indigo-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={addStudent}
              disabled={adding || !addStudentId}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-[12px] text-gray-400 text-center py-2">No students added yet. Click &quot;Add student&quot; above.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-purple-600">{entry.students.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900">{entry.students.name}</p>
                {entry.price && (
                  <p className="text-[11px] text-gray-400">${Number(entry.price).toFixed(0)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {entry.price && Number(entry.price) > 0 && (
                  <button
                    onClick={() => updatePayment(entry.id, entry.payment_status === 'paid' ? 'pending' : 'paid')}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      entry.payment_status === 'paid'
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {entry.payment_status === 'paid' && <CheckCircle className="h-3 w-3" />}
                    {entry.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </button>
                )}
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
