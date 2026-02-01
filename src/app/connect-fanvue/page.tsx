'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Fanvue OAuth Connection Page
 * Redirects to the OAuth login API route
 */
export default function ConnectFanvuePage() {
  useEffect(() => {
    // Redirect to OAuth login API
    window.location.href = '/api/oauth/login'
  }, [])

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
