interface Session {
  username: string
  role: string
  exp: number
}

export async function createSession(username: string, role = "admin"): Promise<string> {
  const session: Session = { username, role, exp: Date.now() + 86_400_000 }
  const payload = btoa(JSON.stringify(session))
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const sigHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${payload}.${sigHex}`
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) return null
    const [payloadB64, sigHex] = parts
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => Number.parseInt(b, 16))) as Uint8Array<ArrayBuffer>
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadB64))
    if (!valid) return null
    const session: Session = JSON.parse(atob(payloadB64))
    if (session.exp < Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME || "admin"
  const adminPass = process.env.ADMIN_PASSWORD || "vaultbase"
  return username === adminUser && password === adminPass
}

function getSecret(): string {
  const secret = process.env.APP_SECRET
  if (!secret) throw new Error("APP_SECRET environment variable is not set")
  return secret
}
