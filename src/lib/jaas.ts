import crypto from 'crypto'

// JaaS (Jitsi as a Service, 8x8) credentials. When these are present the video
// room uses 8x8.vc with a server-signed JWT — the user is auto-authenticated as
// moderator (no extra Google login), no 5-minute demo cutoff, no watermark.
// When absent, the app falls back to the public meet.jit.si demo server.
export function jaasConfigured(): boolean {
  return Boolean(
    process.env.JAAS_APP_ID &&
    process.env.JAAS_KID &&
    process.env.JAAS_PRIVATE_KEY
  )
}

export function getJaasAppId(): string | null {
  return process.env.JAAS_APP_ID ?? null
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

/**
 * Mint a short-lived RS256 JWT for JaaS. Signed with Node's built-in crypto —
 * no external dependency. Returns null if JaaS isn't configured.
 */
export function mintJaasToken(opts: {
  userName: string
  userId: string
  room?: string
  moderator?: boolean
}): string | null {
  const appId = process.env.JAAS_APP_ID
  const kid = process.env.JAAS_KID
  // Env vars store the PEM with literal "\n" — restore real newlines.
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!appId || !kid || !privateKey) return null

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', kid, typ: 'JWT' }
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: opts.room ?? '*',
    iat: now,
    nbf: now - 10,
    exp: now + 3 * 60 * 60, // 3h
    context: {
      user: {
        id: opts.userId,
        name: opts.userName,
        moderator: opts.moderator === false ? 'false' : 'true',
      },
      features: {
        livestreaming: 'false',
        recording: 'false',
        transcription: 'false',
        'outbound-call': 'false',
      },
    },
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  try {
    const signature = crypto
      .sign('RSA-SHA256', Buffer.from(signingInput), privateKey)
      .toString('base64url')
    return `${signingInput}.${signature}`
  } catch {
    return null
  }
}
