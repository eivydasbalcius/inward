import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// App-level encryption for secrets stored in the DB (Google refresh token now, therapy notes later).
// Key = scrypt(PAYLOAD_SECRET, purpose); payload format: v1.<iv>.<tag>.<ciphertext> (base64url).
const keys = new Map<string, Buffer>()
function key(purpose: string) {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  let k = keys.get(purpose)
  if (!k) {
    k = scryptSync(secret, `inward:${purpose}`, 32)
    keys.set(purpose, k)
  }
  return k
}

export function encrypt(plain: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(purpose), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.')
}

export function decrypt(token: string, purpose: string): string {
  const [v, iv, tag, data] = token.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext')
  const decipher = createDecipheriv('aes-256-gcm', key(purpose), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

/** Signed, expiring value (e.g. OAuth state): <base64url json>.<hmac> */
export function sign(value: object, purpose: string, ttlMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...value, exp: Date.now() + ttlMs })).toString('base64url')
  const mac = createHmac('sha256', key(purpose)).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verify<T extends object>(token: string, purpose: string): T | null {
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = createHmac('sha256', key(purpose)).update(body).digest()
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  const value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { exp: number }
  return value.exp > Date.now() ? value : null
}
