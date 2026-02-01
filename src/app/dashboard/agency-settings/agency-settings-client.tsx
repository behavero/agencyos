'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
    flag: '🇺🇸'
  },
  { 
    value: 'RO', 
    label: 'Romania', 
    description: '3% Revenue + 8% Dividend', 
    defaultRate: 0.11,
    flag: '🇷🇴'
  },
  { 
    value: 'EE', 
    label: 'Estonia', 
    description: '0% Reinvested / 20% Distributed', 
    defaultRate: 0,
    flag: '🇪🇪'
  },
  { 
    value: 'FR', 
    label: 'France', 
    description: '25% Corporate Tax', 
    defaultRate: 0.25,
    flag: '🇫🇷'
  },
] as const

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'RON', label: 'Romanian Leu', symbol: 'lei' },
] as const

export default function AgencySettingsClient({ agency }: AgencySettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: agency?.name || '',
    tax_jurisdiction: (agency?.tax_jurisdiction || 'US') as 'RO' | 'US' | 'EE' | 'FR',
    tax_rate: agency?.tax_rate ?? 0.20,
    currency: agency?.currency || 'USD',
  })

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

      toast.success('Settings saved successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleJurisdictionChange = (value: 'RO' | 'US' | 'EE' | 'FR') => {
    const jurisdiction = TAX_JURISDICTIONS.find(j => j.value === value)
    setForm({
      ...form,
      tax_jurisdiction: value,
      tax_rate: jurisdiction?.defaultRate ?? 0.20,
    })
  }

  const currentJurisdiction = TAX_JURISDICTIONS.find(j => j.value === form.tax_jurisdiction)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agency HQ</h1>
          <p className="text-zinc-400">Configure your agency settings and tax structure</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agency Details Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-zinc-400" />
              <CardTitle className="text-white">Agency Details</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Basic information about your agency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Agency Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your Agency Name"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <Separator className="bg-zinc-800" />

            <div className="space-y-2">
              <Label className="text-zinc-300">Display Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-500">{c.symbol}</span>
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-300">Current Level</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white">
                  Level {agency?.current_level || 1}
                </span>
                <Badge className="bg-zinc-700 text-zinc-300">
                  {agency?.current_level && agency.current_level >= 20 
                    ? 'The Cloner' 
                    : agency?.current_level && agency.current_level >= 15 
                    ? 'The Farmer'
                    : agency?.current_level && agency.current_level >= 5
                    ? 'The Seed'
                    : 'The Ghost'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax & Currency Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-zinc-400" />
              <CardTitle className="text-white">Tax Structure</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Configure your tax jurisdiction and rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Tax Jurisdiction</Label>
              <Select
                value={form.tax_jurisdiction}
                onValueChange={handleJurisdictionChange}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {TAX_JURISDICTIONS.map((j) => (
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
                <p className="text-xs text-zinc-500 mt-1">
                  {currentJurisdiction.description}
                </p>
              )}
            </div>

            <Separator className="bg-zinc-800" />

            <div className="space-y-2">
              <Label className="text-zinc-300">Effective Tax Rate</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="bg-zinc-800 border-zinc-700 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Percent className="w-4 h-4" />
                  </span>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1 border-zinc-700">
                  {(form.tax_rate * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-zinc-500">
                Enter as decimal (e.g., 0.20 = 20%)
              </p>
            </div>

            {/* Formula Preview */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Net Profit Formula</span>
              </div>
              <div className="font-mono text-sm text-zinc-400 space-y-1">
                <p><span className="text-green-400">Gross Revenue</span></p>
                <p className="pl-2">- <span className="text-red-400">Platform Fee (20%)</span></p>
                <p className="pl-2">- <span className="text-red-400">Operating Expenses</span></p>
                <p className="pl-2">× <span className="text-yellow-400">(1 - {(form.tax_rate * 100).toFixed(0)}% Tax)</span></p>
                <p className="border-t border-zinc-700 pt-2 mt-2">
                  = <span className="text-white font-semibold">Net Profit</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treasury Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-zinc-400" />
            <CardTitle className="text-white">Treasury</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Current agency financial status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-500 mb-1">Treasury Balance</p>
              <p className="text-2xl font-bold text-white">
                ${(agency?.treasury_balance || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-500 mb-1">Tax Jurisdiction</p>
              <p className="text-2xl font-bold text-white flex items-center gap-2">
                {currentJurisdiction?.flag} {currentJurisdiction?.label}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-500 mb-1">Effective Tax Rate</p>
              <p className="text-2xl font-bold text-white">
                {(form.tax_rate * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
