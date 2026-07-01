'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072M12 12h.01" />
          </svg>
        </div>
        <h1 className="text-[20px] font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-[13px] text-gray-500 mb-6">
          No internet connection. Connect to the network to continue using Tutafy.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-6 py-2.5 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
