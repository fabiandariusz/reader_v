import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const ENC_PREFIX = 'enc:';

export const SENSITIVE_KEYS = new Set([
  'claude_api_key',
  'openai_api_key',
  'gemini_api_key',
  'assemblyai_api_key',
]);

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? '';
  if (!raw) throw new Error('ENCRYPTION_KEY is not set in backend/.env');
  // 64-char hex → 32 raw bytes
  if (raw.length === 64 && /^[0-9a-f]+$/i.test(raw)) return Buffer.from(raw, 'hex');
  // Fallback: derive 32 bytes via SHA-256 (shorter passphrases)
  return createHash('sha256').update(raw).digest();
}

/** Encrypt a plain-text value. Returns `enc:<iv>:<tag>:<ciphertext>` (all hex). */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key      = getKey();
  const iv       = randomBytes(12);                                      // 96-bit IV for GCM
  const cipher   = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag      = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value produced by `encrypt()`.
 * If the value does not start with `enc:` it is treated as a legacy plain-text
 * value and returned unchanged — this lets the app handle values stored before
 * encryption was introduced without any manual migration step.
 */
export function decrypt(value: string): string {
  if (!value) return '';
  if (!value.startsWith(ENC_PREFIX)) return value;   // legacy plain-text
  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) return value;              // malformed — return as-is
  const [ivHex, tagHex, dataHex] = parts;
  const key      = getKey();
  const iv       = Buffer.from(ivHex,   'hex');
  const tag      = Buffer.from(tagHex,  'hex');
  const data     = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
