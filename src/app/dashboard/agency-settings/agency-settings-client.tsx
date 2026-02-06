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

  useEffect(() => {
    fetchFanvueStatus()
    fetchTeamCount()
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
          {/* Fanvue Connection */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Fanvue Connection</CardTitle>
              </div>
              <CardDescription>
                Connect your Fanvue agency account to sync creator data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFanvue ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : fanvueStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-green-400">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        {fanvueStatus.fanvueUsername
                          ? `Logged in as @${fanvueStatus.fanvueUsername}`
                          : 'Fanvue account linked'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        fanvueStatus.status === 'active'
                          ? 'border-green-500/50 text-green-400'
                          : 'border-yellow-500/50 text-yellow-400'
                      }
                    >
                      {fanvueStatus.status || 'active'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Creators Synced</p>
                      <p className="text-lg font-bold">{fanvueStatus.creatorsCount || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Token Expires</p>
                      <p className="text-sm font-medium">
                        {fanvueStatus.expiresAt
                          ? new Date(fanvueStatus.expiresAt).toLocaleDateString()
                          : 'Auto-refreshed'}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/creator-management')}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Manage Creators
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20">
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Not Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Connect your Fanvue account to start syncing creator data
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard/creator-management')}
                    className="gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect Fanvue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Integrations */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Instagram / Meta', 'Telegram Bot', 'Stripe Payments', 'Google Analytics'].map(
                  name => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10"
                    >
                      <span className="text-sm">{name}</span>
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                  )
                )}
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
