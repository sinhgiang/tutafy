'use client'

export function PrintButton() {
  return (
    <div className="no-print fixed bottom-6 right-6 z-50">
      <button
        onClick={() => window.print()}
        className="bg-indigo-500 hover:bg-indigo-600 text-white text-[14px] font-semibold px-5 py-3 rounded-xl shadow-lg shadow-indigo-200 transition-colors"
      >
        🖨 Print / Save as PDF
      </button>
    </div>
  )
}
