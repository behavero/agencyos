'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

interface DashboardClientProps {
  user: User
  profile: Profile | null
  agency: Agency | null
  models: Model[]
}

export default function DashboardClient({ user, profile, agency, models }: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-lg bg-black/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">🏰</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AgencyOS</h1>
              <p className="text-sm text-gray-400">{agency?.name || 'Your Agency'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              onClick={() => router.push('/api/auth/fanvue')}
            >
              + Add Model
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/40 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-yellow-500">💰 Treasury</CardTitle>
              <CardDescription>Available Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                ${agency?.treasury_balance?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-purple-500">📊 Level</CardTitle>
              <CardDescription>Agency Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                Level {agency?.current_level || 1}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-pink-500">👥 Models</CardTitle>
              <CardDescription>Active Creators</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {models.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Info */}
        <Card className="bg-black/40 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Your Profile</CardTitle>
            <CardDescription>Account Information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-white">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Username:</strong> {profile?.username || 'Not set'}</p>
            <p><strong>Role:</strong> {profile?.role || 'No role assigned'}</p>
            <p><strong>XP:</strong> {profile?.xp_count || 0}</p>
            <p><strong>Streak:</strong> {profile?.current_streak || 0} days 🔥</p>
            <p><strong>League:</strong> {profile?.league_rank || 'Iron'}</p>
          </CardContent>
        </Card>

        {/* Models List */}
        {models.length > 0 && (
          <Card className="mt-6 bg-black/40 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Your Models</CardTitle>
              <CardDescription>Manage your creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      {model.avatar_url ? (
                        <img
                          src={model.avatar_url}
                          alt={model.name || ''}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{model.name}</h3>
                      <p className="text-sm text-gray-400">Status: {model.status}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
