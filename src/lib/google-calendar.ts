export const runtime = 'nodejs'

interface GCalEvent {
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  location?: string
  conferenceData?: {
    createRequest: {
      requestId: string
      conferenceSolutionKey: { type: string }
    }
  }
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

export async function createCalendarEvent(
  refreshToken: string,
  calendarId: string,
  event: GCalEvent
): Promise<{ gcalEventId: string | null; meetLink: string | null }> {
  const accessToken = await getAccessToken(refreshToken)
  if (!accessToken) return { gcalEventId: null, meetLink: null }

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  )
  if (event.conferenceData) {
    url.searchParams.set('conferenceDataVersion', '1')
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  const data = await res.json()

  const meetLink: string | null =
    data.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string; uri?: string }) => ep.entryPointType === 'video'
    )?.uri ?? null

  return { gcalEventId: data.id ?? null, meetLink }
}

export async function updateCalendarEvent(
  refreshToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GCalEvent>
): Promise<void> {
  const accessToken = await getAccessToken(refreshToken)
  if (!accessToken) return

  // conferenceDataVersion=1 ensures an existing Meet link is preserved on PATCH
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
  )
  url.searchParams.set('conferenceDataVersion', '1')

  await fetch(url.toString(), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
}

export async function deleteCalendarEvent(
  refreshToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const accessToken = await getAccessToken(refreshToken)
  if (!accessToken) return

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
}
