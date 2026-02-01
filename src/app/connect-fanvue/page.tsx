'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Fanvue OAuth Connection Page
 * This page initiates the OAuth flow by redirecting to Fanvue
 * Using a dedicated page ensures the redirect always works
 */
export default function ConnectFanvuePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Generate PKCE parameters
    const generatePKCE = async () => {
      try {
        // Generate code verifier (random 32 bytes, base64url encoded)
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        const codeVerifier = btoa(String.fromCharCode(...array))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')

        // Generate code challenge (SHA-256 hash of verifier, base64url encoded)
        const encoder = new TextEncoder()
        const data = encoder.encode(codeVerifier)
        const digest = await crypto.subtle.digest('SHA-256', data)
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')

        // Generate state for CSRF protection
        const stateArray = new Uint8Array(32)
        crypto.getRandomValues(stateArray)
        const state = Array.from(stateArray, b => b.toString(16).padStart(2, '0')).join('')

        // Store in cookies via API
        await fetch('/api/oauth/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeVerifier, state }),
        })

        // Build authorization URL
        const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
        const redirectUri = `${window.location.origin}/api/oauth/callback`
        const scopes = 'openid offline_access offline read:self read:creator read:insights read:chat write:chat read:fan read:media read:post write:post read:agency'

        const authUrl = new URL('https://auth.fanvue.com/oauth2/auth')
        authUrl.searchParams.set('client_id', clientId!)
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', scopes)
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('code_challenge', codeChallenge)
        authUrl.searchParams.set('code_challenge_method', 'S256')

        console.log('[OAuth] Redirecting to Fanvue:', authUrl.toString())

        // Redirect to Fanvue
        window.location.href = authUrl.toString()
      } catch (err: any) {
        console.error('[OAuth] Error:', err)
        setError(err.message || 'Failed to initiate OAuth')
      }
    }

    generatePKCE()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Connection Failed</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/dashboard/creator-management"
            className="inline-flex px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Go Back
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Connecting to Fanvue</h1>
        <p className="text-zinc-400">Redirecting you to authorize your account...</p>
      </div>
    </div>
  )
}
