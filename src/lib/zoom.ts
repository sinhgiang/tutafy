export async function createZoomMeeting(params: {
  topic: string
  startTime: string // ISO 8601
  duration: number // minutes
}): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  if (!accountId || !clientId || !clientSecret) return null

  // Get access token
  const tokenRes = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
  if (!tokenRes.ok) return null
  const { access_token } = await tokenRes.json()

  // Create meeting
  const meetRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      type: 2, // scheduled
      start_time: params.startTime,
      duration: params.duration,
      settings: { waiting_room: false, join_before_host: true, auto_recording: 'none' },
    }),
  })
  if (!meetRes.ok) return null
  const meeting = await meetRes.json()
  return meeting.join_url ?? null
}
