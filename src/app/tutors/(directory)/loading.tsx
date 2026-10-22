import { CardSkeleton } from '@/components/directory/TutorCard'

// Shown while the list is read (T-0769): the same grid as the page, grey placeholders instead of tutors.
export default function Loading() {
  return (
    <main className="max-w-[1120px] mx-auto px-4 pt-7 pb-12 min-h-screen bg-[#F7F8FA]" aria-busy="true" aria-label="Loading tutors">
      <div className="h-9 w-3/4 max-w-xl bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-1/2 max-w-md bg-gray-100 rounded animate-pulse mt-3" />
      <div className="h-12 bg-gray-100 rounded-[14px] animate-pulse mt-6" />
      <div className="grid grid-cols-1 gap-3.5 min-[721px]:grid-cols-2 min-[721px]:gap-5 min-[1001px]:grid-cols-3 mt-8">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    </main>
  )
}
