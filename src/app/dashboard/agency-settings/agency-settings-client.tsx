'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database.types'
import {
  Crown,
  Building2,
  Globe,
  Save,
  Loader2,
  DollarSign,
  Percent,
  Users,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']

interface AgencySettingsClientProps {
  profile: Profile | null
  agency: Agency | null
  models: Array<{ id: string; name: string; status: string | null }>
}

const TAX_JURISDICTIONS = [
  { value: 'US', label: 'United States', taxInfo: '0% (LLC Pass-through)' },
  { value: 'RO', label: 'Romania', taxInfo: '3% Revenue + 8% Dividend' },
  { value: 'EE', label: 'Estonia', taxInfo: '0% Reinvested / 20% Distributed' },
  { value: 'FR', label: 'France', taxInfo: '25% Corp Tax' },
]

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'RON', label: 'Romanian Leu (RON)', symbol: 'RON' },
]

export default function AgencySettingsClient({ profile, agency, models }: AgencySettingsClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: agency?.name || '',
    tax_jurisdiction: agency?.tax_jurisdiction || 'US',
    tax_rate: agency?.tax_rate ? (agency.tax_rate * 100).toString() : '20',
    currency: agency?.currency || 'USD',
  })

  const supabase = createClient()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
          tax_jurisdiction: form.tax_jurisdiction as 'RO' | 'US' | 'EE' | 'FR',
          tax_rate: parseFloat(form.tax_rate) / 100, // Convert to decimal
          currency: form.currency,
        })
        .eq('id', agency.id)

      if (error) throw error

      toast.success('Agency settings saved!')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedJurisdiction = TAX_JURISDICTIONS.find(j => j.value === form.tax_jurisdiction)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agency HQ</h1>
          <p className="text-muted-foreground mt-1">
            Configure your agency settings, tax rates, and financial preferences
          </p>
        </div>
      </div>

      {/* Agency Level Badge */}
      <div className="flex items-center gap-3">
        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black gap-1 px-3 py-1">
          <Crown className="w-4 h-4" />
          Level {agency?.current_level || 1}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          {models.length} Creator{models.length !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <DollarSign className="w-3 h-3" />
          Treasury: ${Number(agency?.treasury_balance || 0).toLocaleString()}
        </Badge>
      </div>

      {/* Main Settings Card */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Agency Information</CardTitle>
          </div>
          <CardDescription>
            Update your agency details and financial configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Agency Name */}
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input
                id="agencyName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="FFA Partners"
                className="max-w-md"
              />
            </div>

            {/* Tax Jurisdiction */}
            <div className="space-y-2">
              <Label htmlFor="taxJurisdiction">Tax Jurisdiction</Label>
              <div className="flex items-start gap-4">
                <select
                  id="taxJurisdiction"
                  className="flex-1 max-w-md px-3 py-2 rounded-md border border-border bg-background"
                  value={form.tax_jurisdiction}
                  onChange={(e) => setForm({ ...form, tax_jurisdiction: e.target.value as 'RO' | 'US' | 'EE' | 'FR' })}
                >
                  {TAX_JURISDICTIONS.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
                {selectedJurisdiction && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedJurisdiction.taxInfo}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This affects how taxes are calculated in the dashboard
              </p>
            </div>

            {/* Custom Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="taxRate">Custom Tax Rate (%)</Label>
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.tax_rate}
                  onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                  className="flex-1"
                />
                <Percent className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Override the default tax rate for your jurisdiction. This rate is applied to Net Profit calculations.
              </p>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Primary Currency</Label>
              <select
                id="currency"
                className="flex-1 max-w-md px-3 py-2 rounded-md border border-border bg-background"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Financial Formula Preview */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Net Profit Formula
          </CardTitle>
          <CardDescription>
            How your settings affect the dashboard calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">Gross Revenue</span>
              <span className="text-muted-foreground">- (Fanvue 20% Fee)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">- Total Expenses</span>
              <span className="text-muted-foreground">(from Expenses page)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">× (1 - {form.tax_rate}%)</span>
              <span className="text-muted-foreground">(your tax rate)</span>
            </div>
            <div className="border-t pt-2 mt-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-white font-semibold">= Net Profit</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
