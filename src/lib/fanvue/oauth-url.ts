/**
 * Client-side Fanvue OAuth URL builder
 * Used to open OAuth popup directly to Fanvue (no intermediate redirect)
 */

export async function buildFanvueOAuthURL(): Promise<string> {
  // Call our API to get the OAuth URL (with PKCE params stored in cookies)
  const response = await fetch('/api/auth/fanvue/url')
  
  if (!response.ok) {
    throw new Error('Failed to generate OAuth URL')
  }
  
  const data = await response.json()
  return data.url
}
