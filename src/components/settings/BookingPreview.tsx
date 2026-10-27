// A small picture of the public booking page, drawn from the Settings form as it is NOW (T-0824), so a tutor sees what a student will
// see before pressing Save. It shows the same facts the booking page shows (name, introduction, time zone, price, free trial, lesson
// lengths, cancellation and buffer); it reads nothing from the server and sends nothing.
import { formatMoney } from '@/lib/currency'
import { TRIAL_NAME } from '@/lib/trial'

export type PreviewForm = {
  name: string; bio: string; timezone: string; cancellation_hours: number; buffer_minutes: number
  default_lesson_price: string; trial_enabled: boolean; trial_price: string; currency: string
  lesson_durations: number[]; default_lesson_duration: number; booking_url_active: boolean
}

const intro = (bio: string) => bio.replace(/\s+/g, ' ').trim()

export function BookingPreview({ form, slug, avatarUrl }: { form: PreviewForm; slug: string; avatarUrl: string | null }) {
  const name = form.name.trim() || 'Your name'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const price = Number(form.default_lesson_price)
  const trial = Number(form.trial_price)
  const bio = intro(form.bio)
  return (
    <aside className="set-preview" aria-label="Booking page preview" data-testid="booking-preview">
      <div className="dash-card set-preview-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <b style={{ color: 'var(--d-ink)' }}>How students see you</b>
          <span className={`dash-chip ${form.booking_url_active ? 'is-ok' : 'is-warn'}`}>{form.booking_url_active ? 'Page is on' : 'Page is off'}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="set-preview-photo" aria-hidden="true">{avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the live preview draws whatever photo address is typed in the form, which can be any host
            <img src={avatarUrl} alt="" />
          ) : initials}</span>
          <div style={{ minWidth: 0 }}>
            <b style={{ display: 'block', color: 'var(--d-ink)' }} data-testid="preview-name">{name}</b>
            <span style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{form.timezone.replace('_', ' ')}</span>
          </div>
        </div>
        <p style={{ margin: 0, color: bio ? 'var(--d-ink-2)' : 'var(--d-ink-3)' }} data-testid="preview-bio">
          {bio ? (bio.length > 180 ? `${bio.slice(0, 180)}...` : bio) : 'Your introduction will show here. A few sentences about who you teach and how a lesson goes.'}
        </p>
        <dl>
          <div><dt>Lesson price</dt><dd data-testid="preview-price">{price > 0 ? `${formatMoney(price, form.currency)} per lesson` : 'No price set'}</dd></div>
          {form.trial_enabled && <div><dt>Free trial</dt><dd data-testid="preview-trial">{trial > 0 ? `${TRIAL_NAME} ${formatMoney(trial, form.currency)}` : 'Free trial lesson'}</dd></div>}
          <div><dt>Lesson lengths</dt><dd><span className="set-pills" data-testid="preview-lengths">{[...form.lesson_durations].sort((a, b) => a - b).map(d => (
            <span key={d} className={`dash-chip ${d === form.default_lesson_duration ? 'is-brand-chip' : ''}`}>{d} min</span>
          ))}</span></dd></div>
          <div><dt>Cancellation</dt><dd data-testid="preview-cancel">{form.cancellation_hours > 0 ? `Free up to ${form.cancellation_hours} hours before` : 'No notice needed'}</dd></div>
          <div><dt>Gap between lessons</dt><dd>{form.buffer_minutes > 0 ? `${form.buffer_minutes} minutes` : 'None'}</dd></div>
        </dl>
        {slug && form.booking_url_active ? <a className="dash-btn" href={`/book/${slug}`} target="_blank" rel="noopener noreferrer">Open the real page</a> : <span style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{slug ? 'Turn the page on to share it.' : 'Your link appears once your page has an address.'}</span>}
      </div>
    </aside>
  )
}
