// Client-side encrypted vault for the Fixed-Cost tool.
//
// Data is encrypted with AES-GCM using a key derived from the user's 4-digit PIN
// (PBKDF2-SHA256). localStorage holds only { salt, iv, ciphertext } — never the PIN
// or any readable data. A wrong PIN fails the GCM auth check, so decryption itself
// is the PIN verification.
//
// ⚠️ Threat model: this protects against someone casually opening the page on a shared
// device (the realistic "friend grabs my phone" case). A 4-digit PIN has only 10k
// combinations, so a determined attacker who copies the ciphertext could brute-force it
// offline despite PBKDF2 slowing each guess. For that level, move storage server-side.

export const SECURE_STORAGE_KEY = 'fc-secure:v1'

const PBKDF2_ITERATIONS = 200_000
const enc = new TextEncoder()
const dec = new TextDecoder()

export type Vault = { v: 1; salt: string; iv: string; ct: string }

function toB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export function newSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin) as BufferSource, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptWithKey(key: CryptoKey, salt: Uint8Array, data: unknown): Promise<Vault> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(data)) as BufferSource,
  )
  return { v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(new Uint8Array(ctBuf)) }
}

// Throws if the key is wrong (GCM auth-tag mismatch) — callers treat that as "wrong PIN".
export async function decryptWithKey<T>(key: CryptoKey, vault: Vault): Promise<T> {
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(vault.iv) as BufferSource }, key, fromB64(vault.ct) as BufferSource,
  )
  return JSON.parse(dec.decode(ptBuf)) as T
}

// Derive the key for an existing vault (uses the vault's stored salt).
export async function unlockKey(pin: string, vault: Vault): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const salt = fromB64(vault.salt)
  const key = await deriveKey(pin, salt)
  return { key, salt }
}

export function readVault(): Vault | null {
  try {
    const raw = localStorage.getItem(SECURE_STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (v && v.salt && v.iv && v.ct) return v as Vault
  } catch { /* ignore */ }
  return null
}

export function saveVault(vault: Vault) {
  localStorage.setItem(SECURE_STORAGE_KEY, JSON.stringify(vault))
}

export function clearVault() {
  localStorage.removeItem(SECURE_STORAGE_KEY)
}

export function hasVault(): boolean {
  try { return !!localStorage.getItem(SECURE_STORAGE_KEY) } catch { return false }
}
