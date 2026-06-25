export type Tutor = {
  id: string
  email: string
  name: string
  slug: string
  bio?: string
  avatar_url?: string
  languages: string[]
  timezone: string
  stripe_account_id?: string
  stripe_onboarding_complete: boolean
  booking_url_active: boolean
  cancellation_hours: number
  created_at: string
  updated_at: string
}

export type StudentStatus = 'active' | 'paused' | 'inactive'
export type StudentLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native'

export type Student = {
  id: string
  tutor_id: string
  name: string
  email?: string
  phone?: string
  country?: string
  timezone: string
  level: StudentLevel
  goals?: string
  native_language?: string
  notes?: string
  tags: string[]
  status: StudentStatus
  avatar_url?: string
  created_at: string
  updated_at: string
}

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'free'

export type VocabItem = {
  word: string
  definition: string
  example?: string
}

export type Lesson = {
  id: string
  tutor_id: string
  student_id: string
  starts_at: string
  ends_at: string
  duration_minutes: number
  status: LessonStatus
  zoom_link?: string
  meet_link?: string
  notes?: string
  homework?: string
  vocabulary: VocabItem[]
  recording_url?: string
  price?: number
  currency: string
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
  student?: Student
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type Invoice = {
  id: string
  tutor_id: string
  student_id: string
  lesson_id?: string
  amount: number
  currency: string
  status: InvoiceStatus
  stripe_payment_intent_id?: string
  due_date?: string
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
  student?: Student
}

export type Package = {
  id: string
  tutor_id: string
  name: string
  description?: string
  lessons_count: number
  price: number
  currency: string
  active: boolean
  created_at: string
}

export type Availability = {
  id: string
  tutor_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export type FlashCard = {
  word: string
  definition: string
  example?: string
}

export type DashboardStats = {
  total_students: number
  active_students: number
  lessons_this_week: number
  lessons_this_month: number
  revenue_this_month: number
  revenue_last_month: number
  cancellation_rate: number
}
