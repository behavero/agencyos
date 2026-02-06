'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Shield,
  Bell,
  Save,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  username: string
  role: string
  agency_id: string
  timezone: string | null
  email: string
  avatar_url?: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile form
  const [username, setUsername] = useState('')
  const [timezone, setTimezone] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Notification prefs
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [syncAlerts, setSyncAlerts] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile({
          ...data.profile,
          email: data.email,
        })
        setUsername(data.profile.username || '')
        setTimezone(data.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
      }
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, timezone }),
      })
      if (res.ok) {
        toast.success('Profile updated')
        fetchProfile()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        toast.success('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-green-400 text-primary-foreground text-lg font-bold">
                    {(profile?.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile?.username || 'User'}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile?.role || 'Member'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">
                  Email is managed through your authentication provider
                </p>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  placeholder="e.g. Europe/London"
                />
                <p className="text-xs text-muted-foreground">
                  Used for time-based analytics and scheduling
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword}
              >
                {changingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>

          <TwoFactorCard />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates and alerts via email
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    emailNotifications ? 'bg-primary' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Sync Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when data sync fails or needs attention
                  </p>
                </div>
                <button
                  onClick={() => setSyncAlerts(!syncAlerts)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    syncAlerts ? 'bg-primary' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      syncAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">
                More notification options will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Two-Factor Authentication enrollment card */
function TwoFactorCard() {
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean
    factors: { id: string; friendlyName: string; status: string }[]
  } | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollment, setEnrollment] = useState<{
    factorId: string
    qrCode: string
    secret: string
  } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loadingMfa, setLoadingMfa] = useState(true)

  useEffect(() => {
    fetchMfaStatus()
  }, [])

  async function fetchMfaStatus() {
    try {
      const res = await fetch('/api/user/mfa')
      if (res.ok) {
        const data = await res.json()
        setMfaStatus(data)
      }
    } catch {
      // MFA not available
    } finally {
      setLoadingMfa(false)
    }
  }

  async function handleEnroll() {
    setEnrolling(true)
    try {
      const res = await fetch('/api/user/mfa', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setEnrollment(data)
      } else {
        toast.error(data.error || 'Failed to start enrollment')
      }
    } catch {
      toast.error('Failed to start enrollment')
    } finally {
      setEnrolling(false)
    }
  }

  async function handleVerify() {
    if (!enrollment || verifyCode.length !== 6) return
    setVerifying(true)
    try {
      const res = await fetch('/api/user/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: enrollment.factorId, code: verifyCode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Two-factor authentication enabled!')
        setEnrollment(null)
        setVerifyCode('')
        fetchMfaStatus()
      } else {
        toast.error(data.error || 'Invalid code, please try again')
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  async function handleDisable(factorId: string) {
    try {
      const res = await fetch('/api/user/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId }),
      })
      if (res.ok) {
        toast.success('Two-factor authentication disabled')
        fetchMfaStatus()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to disable 2FA')
      }
    } catch {
      toast.error('Failed to disable 2FA')
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingMfa ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : enrollment ? (
          /* Enrollment flow: show QR code and verify */
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="TOTP QR Code"
                className="mx-auto w-48 h-48 rounded-lg border border-border bg-white p-2"
              />
              <div className="text-xs text-muted-foreground">
                <p>Or enter this secret manually:</p>
                <code className="block mt-1 px-3 py-1.5 bg-muted rounded text-xs font-mono break-all">
                  {enrollment.secret}
                </code>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter the 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-code"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6}>
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEnrollment(null)
                setVerifyCode('')
              }}
            >
              Cancel
            </Button>
          </div>
        ) : mfaStatus?.enabled ? (
          /* 2FA is enabled -- show status and disable option */
          <div className="space-y-3">
            {mfaStatus.factors
              .filter(f => f.status === 'verified')
              .map(factor => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-green-400">Enabled</p>
                      <p className="text-sm text-muted-foreground">{factor.friendlyName}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDisable(factor.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Disable
                  </Button>
                </div>
              ))}
          </div>
        ) : (
          /* 2FA not enabled -- show enable button */
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium">TOTP Authenticator</p>
              <p className="text-sm text-muted-foreground">
                Use an app like Google Authenticator or Authy
              </p>
            </div>
            <Button onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4 mr-2" />
              )}
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
