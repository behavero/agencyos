/**
 * PKCE (Proof Key for Code Exchange) implementation for Fanvue OAuth
 * Required by Fanvue API - see https://api.fanvue.com/docs/oauth/implementation-guide
 */

import { randomBytes, createHash } from 'crypto'

/**
 * Generate a cryptographically secure code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32))
}

/**
 * Generate code challenge from verifier using SHA-256
 */
export function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(createHash('sha256').update(verifier).digest())
}

/**
 * Base64URL encoding (without padding)
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * Generate a secure random state parameter for CSRF protection
 */
export function generateState(): string {
  return randomBytes(32).toString('hex')
}
