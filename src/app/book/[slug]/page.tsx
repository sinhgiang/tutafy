import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GraduationCap } from 'lucide-react'

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, name, bio, avatar_url, timezone, languages, cancellation_hours, booking_url_active')
    .eq('slug', slug)
    .single()

  if (!tutor || !tutor.booking_url_active) notFound()

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('day_of_week')

  const initials = tutor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900">Tutafy</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          <Avatar className="h-20 w-20 flex-shrink-0">
            <AvatarImage src={tutor.avatar_url} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tutor.name}</h1>
            {tutor.languages?.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">Teaches: {tutor.languages.join(', ')}</p>
            )}
            {tutor.bio && <p className="text-gray-600 text-sm mt-2 max-w-lg">{tutor.bio}</p>}
            <p className="text-xs text-gray-400 mt-2">Timezone: {tutor.timezone}</p>
          </div>
        </div>

        <BookingForm tutor={tutor} availability={availability ?? []} />
      </div>
    </div>
  )
}
