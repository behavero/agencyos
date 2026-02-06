/**
 * AES-256-GCM Encryption Utility
 *
 * Used to encrypt/decrypt sensitive data at rest (API keys, OAuth tokens).
 * Requires ENCRYPTION_KEY env var (64-char hex string = 32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV recommended for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string: iv:ciphertext:authTag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Format: iv:ciphertext:authTag (all base64)
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`
}

/**
 * Decrypt a string encrypted by encrypt().
 * Input format: iv:ciphertext:authTag (all base64)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const parts = encryptedData.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format (expected iv:ciphertext:authTag)')
  }

  const [ivB64, ciphertextB64, authTagB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: ${iv.length} (expected ${IV_LENGTH})`)
  }
  if (authTag.length !== TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: ${authTag.length} (expected ${TAG_LENGTH})`)
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Extract the first N characters of a key for display purposes.
 * e.g., "sk-proj-abc123..." -> "sk-proj-..."
 */
export function getKeyPrefix(apiKey: string, length = 8): string {
  if (apiKey.length <= length) return apiKey
  return apiKey.substring(0, length) + '...'
}
