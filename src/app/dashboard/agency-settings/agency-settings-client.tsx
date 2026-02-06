'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Globe,
  Percent,
  DollarSign,
  Save,
  Calculator,
  Info,
  MapPin,
  Shield,
  Link2,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Brain,
  Key,
  Trash2,
  Zap,
} from 'lucide-react'

type Agency = Database['public']['Tables']['agencies']['Row']

interface AgencySettingsClientProps {
  agency: Agency | null
}

const TAX_JURISDICTIONS = [
  {
    value: 'US',
    label: 'United States',
    description: 'LLC Pass-through (0% Corp)',
    defaultRate: 0,
    flag: '🇺🇸',
  },
  {
    value: 'RO',
    label: 'Romania',
    description: '3% Revenue + 8% Dividend',
    defaultRate: 0.11,
    flag: '🇷🇴',
  },
  {
    value: 'EE',
    label: 'Estonia',
    description: '0% Reinvested / 20% Distributed',
    defaultRate: 0,
    flag: '🇪🇪',
  },
  { value: 'FR', label: 'France', description: '25% Corporate Tax', defaultRate: 0.25, flag: '🇫🇷' },
  {
    value: 'UK',
    label: 'United Kingdom',
    description: '25% Corporate Tax',
    defaultRate: 0.25,
    flag: '🇬🇧',
  },
  {
    value: 'DE',
    label: 'Germany',
    description: '~30% (Corp + Trade)',
    defaultRate: 0.3,
    flag: '🇩🇪',
  },
  {
    value: 'PT',
    label: 'Portugal',
    description: '21% Corporate Tax',
    defaultRate: 0.21,
    flag: '🇵🇹',
  },
  {
    value: 'AE',
    label: 'UAE',
    description: '9% Corporate Tax (over AED 375k)',
    defaultRate: 0.09,
    flag: '🇦🇪',
  },
] as const

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'RON', label: 'Romanian Leu', symbol: 'lei' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
] as const

export default function AgencySettingsClient({ agency }: AgencySettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: agency?.name || '',
    tax_jurisdiction: (agency?.tax_jurisdiction || 'US') as string,
    tax_rate: agency?.tax_rate ?? 0.2,
    currency: agency?.currency || 'USD',
  })

  // Billing address (stored in agency record or separate)
  const [billing, setBilling] = useState({
    company_name: (agency as any)?.billing_company_name || '',
    address_line1: (agency as any)?.billing_address_line1 || '',
    address_line2: (agency as any)?.billing_address_line2 || '',
    city: (agency as any)?.billing_city || '',
    state: (agency as any)?.billing_state || '',
    postal_code: (agency as any)?.billing_postal_code || '',
    country: (agency as any)?.billing_country || '',
    vat_number: (agency as any)?.billing_vat_number || '',
  })

  // Fanvue connection status
  const [fanvueStatus, setFanvueStatus] = useState<{
    connected: boolean
    status?: string
    fanvueUsername?: string
    creatorsCount?: number
    expiresAt?: string
  } | null>(null)
  const [loadingFanvue, setLoadingFanvue] = useState(true)

  // Team members count
  const [teamCount, setTeamCount] = useState(0)

  // OpenClaw API Key state
  const [openclawKeys, setOpenclawKeys] = useState<
    Array<{
      id: string
      provider: string
      model_preference: string | null
      key_prefix: string
      is_active: boolean
      is_valid: boolean
      created_at: string
      last_used_at: string | null
    }>
  >([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [newKeyProvider, setNewKeyProvider] = useState<string>('openai')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyModel, setNewKeyModel] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null)

  const PROVIDER_OPTIONS = [
    {
      value: 'openai',
      label: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
      icon: '🟢',
    },
    {
      value: 'anthropic',
      label: 'Anthropic',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
      icon: '🟠',
    },
    {
      value: 'groq',
      label: 'Groq',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
      icon: '⚡',
    },
  ]

  useEffect(() => {
    fetchFanvueStatus()
    fetchTeamCount()
    fetchOpenclawKeys()
  }, [agency?.id])

  async function fetchFanvueStatus() {
    if (!agency?.id) return
    try {
      const res = await fetch(`/api/agency/fanvue-status?agencyId=${agency.id}`)
      if (res.ok) {
        const data = await res.json()
        setFanvueStatus(data)
      } else {
        setFanvueStatus({ connected: false })
      }
    } catch {
      setFanvueStatus({ connected: false })
    } finally {
      setLoadingFanvue(false)
    }
  }

  async function fetchTeamCount() {
    if (!agency?.id) return
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id)
    setTeamCount(count || 0)
  }

  async function fetchOpenclawKeys() {
    if (!agency?.id) return
    try {
      const res = await fetch(`/api/agency/api-keys?agencyId=${agency.id}`)
      if (res.ok) {
        const data = await res.json()
        setOpenclawKeys(data.keys || [])
      }
    } catch {
      // Silently fail — keys tab just shows empty
    } finally {
      setLoadingKeys(false)
    }
  }

  async function handleSaveApiKey() {
    if (!agency?.id || !newKeyValue.trim()) {
      toast.error('Please enter an API key')
      return
    }
    setSavingKey(true)
    try {
      const res = await fetch('/api/agency/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: agency.id,
          provider: newKeyProvider,
          apiKey: newKeyValue.trim(),
          modelPreference: newKeyModel || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to save API key')
        return
      }
      toast.success(
        `${newKeyProvider.charAt(0).toUpperCase() + newKeyProvider.slice(1)} key activated — OpenClaw is ready`
      )
      setNewKeyValue('')
      setNewKeyModel('')
      fetchOpenclawKeys()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save API key')
    } finally {
      setSavingKey(false)
    }
  }

  async function handleDeleteApiKey(provider: string) {
    if (!agency?.id) return
    setDeletingProvider(provider)
    try {
      const res = await fetch('/api/agency/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyId: agency.id, provider }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete key')
        return
      }
      toast.success(`${provider} key removed`)
      fetchOpenclawKeys()
    } catch {
      toast.error('Failed to delete key')
    } finally {
      setDeletingProvider(null)
    }
  }

  const handleSave = async () => {
    if (!agency?.id) {
      toast.error('No agency found')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          name: form.name,
          tax_jurisdiction: form.tax_jurisdiction,
          tax_rate: form.tax_rate,
          currency: form.currency,
        })
        .eq('id', agency.id)

      if (error) throw error

      toast.success('Agency settings saved')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleJurisdictionChange = (value: string) => {
    const jurisdiction = TAX_JURISDICTIONS.find(j => j.value === value)
    setForm({
      ...form,
      tax_jurisdiction: value,
      tax_rate: jurisdiction?.defaultRate ?? 0.2,
    })
  }

  const currentJurisdiction = TAX_JURISDICTIONS.find(j => j.value === form.tax_jurisdiction)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Settings</h1>
          <p className="text-muted-foreground">
            Manage your agency configuration, billing, and integrations
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="openclaw" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI / OpenClaw
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* ====== General Tab ====== */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agency Details */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Agency Details</CardTitle>
                </div>
                <CardDescription>Basic information about your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Agency Name</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your Agency Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={v => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{c.symbol}</span>
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Agency Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Level</p>
                      <p className="text-lg font-bold">Level {agency?.current_level || 1}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                      <p className="text-lg font-bold">{teamCount}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Structure */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Tax Structure</CardTitle>
                </div>
                <CardDescription>Configure your tax jurisdiction and rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax Jurisdiction</Label>
                  <Select value={form.tax_jurisdiction} onValueChange={handleJurisdictionChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_JURISDICTIONS.map(j => (
                        <SelectItem key={j.value} value={j.value}>
                          <span className="flex items-center gap-2">
                            <span>{j.flag}</span>
                            {j.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentJurisdiction && (
                    <p className="text-xs text-muted-foreground">
                      {currentJurisdiction.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Effective Tax Rate</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={form.tax_rate}
                        onChange={e =>
                          setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })
                        }
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Percent className="w-4 h-4" />
                      </span>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {(form.tax_rate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter as decimal (e.g., 0.20 = 20%)
                  </p>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Net Profit Formula</span>
                  </div>
                  <div className="font-mono text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="text-green-400">Gross Revenue</span>
                    </p>
                    <p className="pl-2">
                      - <span className="text-red-400">Platform Fee (20%)</span>
                    </p>
                    <p className="pl-2">
                      - <span className="text-red-400">Operating Expenses</span>
                    </p>
                    <p className="pl-2">
                      x{' '}
                      <span className="text-yellow-400">
                        (1 - {(form.tax_rate * 100).toFixed(0)}% Tax)
                      </span>
                    </p>
                    <p className="border-t border-border pt-2 mt-2">
                      = <span className="text-foreground font-semibold">Net Profit</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Treasury */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Treasury</CardTitle>
              </div>
              <CardDescription>Current agency financial status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Treasury Balance</p>
                  <p className="text-2xl font-bold">
                    ${(agency?.treasury_balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Tax Jurisdiction</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    {currentJurisdiction?.flag} {currentJurisdiction?.label}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Effective Tax Rate</p>
                  <p className="text-2xl font-bold">{(form.tax_rate * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Billing Tab ====== */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Billing Address</CardTitle>
              </div>
              <CardDescription>
                Used for invoices, tax reporting, and legal correspondence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company / Legal Name</Label>
                <Input
                  value={billing.company_name}
                  onChange={e => setBilling({ ...billing, company_name: e.target.value })}
                  placeholder="Your registered company name"
                />
              </div>

              <div className="space-y-2">
                <Label>Address Line 1</Label>
                <Input
                  value={billing.address_line1}
                  onChange={e => setBilling({ ...billing, address_line1: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={billing.address_line2}
                  onChange={e => setBilling({ ...billing, address_line2: e.target.value })}
                  placeholder="Apt, suite, unit, etc. (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={billing.city}
                    onChange={e => setBilling({ ...billing, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State / Province</Label>
                  <Input
                    value={billing.state}
                    onChange={e => setBilling({ ...billing, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={billing.postal_code}
                    onChange={e => setBilling({ ...billing, postal_code: e.target.value })}
                    placeholder="ZIP / Postal code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={billing.country}
                    onChange={e => setBilling({ ...billing, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>VAT / Tax ID Number</Label>
                <Input
                  value={billing.vat_number}
                  onChange={e => setBilling({ ...billing, vat_number: e.target.value })}
                  placeholder="e.g. EU123456789 (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Required for EU VAT reverse charge or US EIN reporting
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Billing address fields are saved locally. Database columns for billing will be added
                in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Integrations Tab ====== */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Active Connections */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>Platforms currently connected to your agency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Fanvue Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-lg">
                    &#x1F48E;
                  </div>
                  <div>
                    <p className="font-medium">Fanvue</p>
                    <p className="text-xs text-muted-foreground">
                      {loadingFanvue
                        ? 'Checking...'
                        : fanvueStatus?.connected
                          ? `${fanvueStatus.creatorsCount || 0} creators synced`
                          : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingFanvue ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : fanvueStatus?.connected ? (
                    <Badge variant="outline" className="border-green-500/50 text-green-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-500/50 text-zinc-400">
                      <XCircle className="w-3 h-3 mr-1" /> Inactive
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/creator-management')}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Integrations */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
              <CardDescription>
                Connect additional creator platforms to manage everything in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'OnlyFans',
                    emoji: '🔵',
                    desc: 'Sync OF creator stats, earnings, and subscriber data',
                    priority: true,
                  },
                  {
                    name: 'Fansly',
                    emoji: '💙',
                    desc: 'Multi-platform creator management with Fansly data',
                    priority: true,
                  },
                  {
                    name: 'Instagram / Meta',
                    emoji: '📸',
                    desc: 'Track creator IG growth, reach, and engagement metrics',
                    priority: true,
                  },
                  {
                    name: 'TikTok',
                    emoji: '🎵',
                    desc: 'Monitor TikTok views, followers, and viral content',
                    priority: false,
                  },
                  {
                    name: 'X (Twitter)',
                    emoji: '𝕏',
                    desc: 'Track impressions, engagement, and promotional posts',
                    priority: false,
                  },
                  {
                    name: 'Reddit',
                    emoji: '🟠',
                    desc: 'Track subreddit promotion performance and karma',
                    priority: false,
                  },
                ].map(platform => (
                  <div
                    key={platform.name}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg shrink-0">
                      {platform.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{platform.name}</p>
                        {platform.priority && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Planned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{platform.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Business Tools */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Business Tools</CardTitle>
              <CardDescription>
                Automate your agency operations with these integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'Telegram Bot',
                    emoji: '✈️',
                    desc: 'Real-time alerts for new subs, messages, and milestones',
                    category: 'Notifications',
                  },
                  {
                    name: 'Discord Webhooks',
                    emoji: '🎮',
                    desc: 'Push sync alerts and revenue updates to your team server',
                    category: 'Notifications',
                  },
                  {
                    name: 'Stripe',
                    emoji: '💳',
                    desc: 'Automate agency fee collection and creator payouts',
                    category: 'Payments',
                  },
                  {
                    name: 'Wise / PayPal',
                    emoji: '💸',
                    desc: 'International payouts to creators in their local currency',
                    category: 'Payments',
                  },
                  {
                    name: 'QuickBooks / Xero',
                    emoji: '📊',
                    desc: 'Auto-sync revenue, expenses, and payroll to your books',
                    category: 'Accounting',
                  },
                  {
                    name: 'Google Analytics',
                    emoji: '📈',
                    desc: 'Track bio page traffic, conversions, and traffic sources',
                    category: 'Analytics',
                  },
                  {
                    name: 'Zapier / Make',
                    emoji: '⚡',
                    desc: 'Build custom automations (new sub → Telegram, revenue → Sheets)',
                    category: 'Automation',
                  },
                  {
                    name: 'Google Sheets',
                    emoji: '📋',
                    desc: 'Auto-export daily revenue reports and creator performance',
                    category: 'Reporting',
                  },
                ].map(tool => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg shrink-0">
                      {tool.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tool.name}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-zinc-600 text-zinc-400"
                        >
                          {tool.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Integrations are on the roadmap. Vote for the ones you want most — reach out to the
            team.
          </p>
        </TabsContent>

        {/* ====== AI / OpenClaw Tab ====== */}
        <TabsContent value="openclaw" className="space-y-6">
          {/* Status Banner */}
          <Card
            className={`glass ${openclawKeys.some(k => k.is_active && k.is_valid) ? 'border-green-500/30' : 'border-zinc-500/30'}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${openclawKeys.some(k => k.is_active && k.is_valid) ? 'bg-green-500/10' : 'bg-zinc-500/10'}`}
                >
                  <Brain
                    className={`w-6 h-6 ${openclawKeys.some(k => k.is_active && k.is_valid) ? 'text-green-400' : 'text-zinc-400'}`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">OpenClaw Neural Core</h3>
                  <p className="text-sm text-muted-foreground">
                    {openclawKeys.some(k => k.is_active && k.is_valid)
                      ? `Active — using ${openclawKeys.find(k => k.is_active && k.is_valid)?.provider?.toUpperCase()} (${openclawKeys.find(k => k.is_active && k.is_valid)?.model_preference || 'default model'})`
                      : 'Inactive — add an API key to activate Alfred AI with your own LLM'}
                  </p>
                </div>
                {openclawKeys.some(k => k.is_active && k.is_valid) ? (
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    <Zap className="w-3 h-3 mr-1" /> Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-zinc-500/50 text-zinc-400">
                    Free Tier (Groq)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Keys */}
          {loadingKeys ? (
            <Card className="glass">
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : openclawKeys.length > 0 ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  Configured Providers
                </CardTitle>
                <CardDescription>Your active LLM API keys</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {openclawKeys.map(key => {
                  const providerInfo = PROVIDER_OPTIONS.find(p => p.value === key.provider)
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg">
                          {providerInfo?.icon || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{providerInfo?.label || key.provider}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {key.key_prefix} &middot; {key.model_preference || 'default'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {key.is_valid ? (
                          <Badge variant="outline" className="border-green-500/50 text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-500/50 text-red-400">
                            <XCircle className="w-3 h-3 mr-1" /> Invalid
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteApiKey(key.provider)}
                          disabled={deletingProvider === key.provider}
                        >
                          {deletingProvider === key.provider ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}

          {/* Add New Key */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                {openclawKeys.length > 0 ? 'Add Another Provider' : 'Add API Key'}
              </CardTitle>
              <CardDescription>
                Bring your own LLM key — OpenClaw works with OpenAI, Anthropic, and Groq. Keys are
                encrypted at rest (AES-256-GCM) and never exposed to the client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={newKeyProvider}
                  onValueChange={v => {
                    setNewKeyProvider(v)
                    setNewKeyModel('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={newKeyValue}
                  onChange={e => setNewKeyValue(e.target.value)}
                  placeholder={
                    newKeyProvider === 'openai'
                      ? 'sk-proj-...'
                      : newKeyProvider === 'anthropic'
                        ? 'sk-ant-...'
                        : 'gsk_...'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Your key is validated, encrypted, and stored securely. It is never logged or
                  exposed.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Model (optional)</Label>
                <Select value={newKeyModel} onValueChange={setNewKeyModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use provider default" />
                  </SelectTrigger>
                  <SelectContent>
                    {(PROVIDER_OPTIONS.find(p => p.value === newKeyProvider)?.models || []).map(
                      m => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSaveApiKey}
                disabled={savingKey || !newKeyValue.trim()}
                className="w-full gap-2"
              >
                {savingKey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating & Saving...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Validate & Activate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                How OpenClaw Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium mb-1">1. Add Your Key</p>
                  <p className="text-sm text-muted-foreground">
                    Paste your API key from OpenAI, Anthropic, or Groq. We validate it instantly and
                    encrypt it.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium mb-1">2. Alfred Upgrades</p>
                  <p className="text-sm text-muted-foreground">
                    Alfred (your AI advisor) switches to your chosen model. GPT-4o for creativity,
                    Claude for logic, Groq for speed.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium mb-1">3. Full Agency Context</p>
                  <p className="text-sm text-muted-foreground">
                    OpenClaw feeds Alfred 30 days of your KPIs, revenue trends, and model
                    performance — real-time intelligence.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Security Tab ====== */}
        <TabsContent value="security" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Team Access</CardTitle>
              </div>
              <CardDescription>Manage who has access to your agency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{teamCount} Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      Manage roles and permissions for your team
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => router.push('/dashboard/team')}>
                  Manage Team
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Invite Members</p>
                    <p className="text-sm text-muted-foreground">
                      Send invite links to add new team members
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => router.push('/dashboard/team/invite')}>
                  Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="glass border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>Irreversible actions that affect your entire agency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="font-medium">Disconnect Fanvue</p>
                  <p className="text-sm text-muted-foreground">
                    Remove the Fanvue connection. Data already synced will be kept.
                  </p>
                </div>
                <Button variant="destructive" size="sm" disabled={!fanvueStatus?.connected}>
                  Disconnect
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="font-medium">Delete Agency</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete the agency and all associated data. This cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" size="sm" disabled>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
