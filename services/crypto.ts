/**
 * UPIC cryptography (vault format v2).
 *
 *  - Key derivation: PBKDF2-HMAC-SHA256 with a random 16-byte salt per user.
 *  - Encryption:     AES-256-GCM (authenticated — tampering is detected) with a
 *                    fresh random 96-bit IV for every encryption.
 *  - Randomness:     the platform CSPRNG via expo-crypto.
 *
 * The vault is encrypted with a random 256-bit data key (DEK). The DEK is then
 * "wrapped" (encrypted) separately by a key derived from the master password and
 * by a key derived from the backup recovery key. That is what makes recovery
 * possible without UPIC ever being able to read the vault (zero-knowledge).
 *
 * Implementations come from @noble/ciphers and @noble/hashes (audited, pure JS).
 */
import * as ExpoCrypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

/** PBKDF2 work factor. Stored with every hash so it can be raised later. */
export const KDF_ITERATIONS = 75_000;
const ACCOUNT_HASH_ITERATIONS = 50_000;

export interface Box {
  iv: string; // base64
  ct: string; // base64 (ciphertext + GCM tag)
}

/* ---------------- encoding ---------------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

export function fromBase64(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) |
      (B64.indexOf(clean[i + 3]) & 63);
    if (o < len) out[o++] = (n >> 16) & 255;
    if (o < len) out[o++] = (n >> 8) & 255;
    if (o < len) out[o++] = n & 255;
  }
  return out;
}

export const utf8 = {
  encode: (s: string) => new TextEncoder().encode(s),
  decode: (b: Uint8Array) => new TextDecoder().decode(b),
};

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Comparison that takes the same time whether or not the inputs match. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------- randomness ---------------- */

export function randomBytes(n: number): Uint8Array {
  return ExpoCrypto.getRandomBytes(n);
}

/** Uniform random integer in [0, max) without modulo bias. */
export function randomInt(max: number): number {
  const limit = Math.floor(256 / max) * max;
  while (true) {
    const [b] = randomBytes(1);
    if (b < limit) return b % max;
  }
}

export function randomString(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomString(10, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
}

/* ---------------- KDF + AEAD ---------------- */

export function newKdfParams(): { alg: 'PBKDF2-SHA256'; salt: string; iterations: number } {
  return { alg: 'PBKDF2-SHA256', salt: toBase64(randomBytes(16)), iterations: KDF_ITERATIONS };
}

export async function deriveKey(secret: string, saltB64: string, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, utf8.encode(secret.normalize('NFKC')), fromBase64(saltB64), {
    c: iterations,
    dkLen: 32,
    asyncTick: 16,
  });
}

export function seal(key: Uint8Array, plaintext: Uint8Array): Box {
  const iv = randomBytes(12);
  const ct = gcm(key, iv).encrypt(plaintext);
  return { iv: toBase64(iv), ct: toBase64(ct) };
}

/** Throws if the key is wrong or the data was modified. */
export function open(key: Uint8Array, box: Box): Uint8Array {
  return gcm(key, fromBase64(box.iv)).decrypt(fromBase64(box.ct));
}

export function sealJSON(key: Uint8Array, value: unknown): Box {
  return seal(key, utf8.encode(JSON.stringify(value)));
}

export function openJSON<T>(key: Uint8Array, box: Box): T {
  return JSON.parse(utf8.decode(open(key, box))) as T;
}

/** Value stored to check a master password without storing anything that decrypts the vault. */
export function makeVerifier(kek: Uint8Array): string {
  return 'v2:' + toBase64(sha256(concat(kek, utf8.encode('upic-master-verifier'))));
}

/* ---------------- recovery key ---------------- */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 160-bit backup key shown once, e.g. "7KQ2-M9XD-…" (8 groups of 4). */
export function generateRecoveryKey(): string {
  const raw = randomString(32, CROCKFORD);
  return raw.match(/.{4}/g)!.join('-');
}

export function normalizeRecoveryKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

/* ---------------- password hashing (account password) ---------------- */

export async function hashSecret(secret: string, iterations = ACCOUNT_HASH_ITERATIONS): Promise<string> {
  const salt = toBase64(randomBytes(16));
  const hash = toBase64(await deriveKey(secret, salt, iterations));
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function legacySha256Hex(secret: string): Promise<string> {
  return ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, secret, {
    encoding: ExpoCrypto.CryptoEncoding.HEX,
  });
}

/** Verifies a stored hash. `legacy` is true for old unsalted SHA-256 hashes that should be upgraded. */
export async function verifySecret(secret: string, stored: string): Promise<{ ok: boolean; legacy: boolean }> {
  if (!stored) return { ok: false, legacy: false };
  if (stored.startsWith('pbkdf2$')) {
    const [, iter, salt, hash] = stored.split('$');
    const candidate = toBase64(await deriveKey(secret, salt, parseInt(iter, 10)));
    return { ok: constantTimeEqual(candidate, hash), legacy: false };
  }
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const candidate = await legacySha256Hex(secret);
    return { ok: constantTimeEqual(candidate, stored.toLowerCase()), legacy: true };
  }
  return { ok: false, legacy: false };
}

export async function legacyMasterHashMatches(secret: string, stored: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(stored)) return false;
  return constantTimeEqual(await legacySha256Hex(secret), stored.toLowerCase());
}
