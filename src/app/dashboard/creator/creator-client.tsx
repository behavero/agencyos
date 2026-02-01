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
  MapPin,
  Save,
  Loader2
} from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']

interface CreatorClientProps {
  profile: Profile | null
  agency: Agency | null
}

export default function CreatorClient({ profile, agency }: CreatorClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [agencyForm, setAgencyForm] = useState({
    name: agency?.name || '',
    tax_jurisdiction: agency?.tax_jurisdiction || 'US',
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    // TODO: Implement save logic
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creator Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your agency profile and preferences
        </p>
      </div>

      {/* Agency Information */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Agency Information</CardTitle>
          </div>
          <CardDescription>Update your agency details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input
                id="agencyName"
                value={agencyForm.name}
                onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                placeholder="FFA Partners"
              />
            </div>
            <div>
              <Label htmlFor="taxJurisdiction">Tax Jurisdiction</Label>
              <select
                id="taxJurisdiction"
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
                value={agencyForm.tax_jurisdiction || 'US'}
                onChange={(e) => setAgencyForm({ ...agencyForm, tax_jurisdiction: e.target.value })}
              >
                <option value="US">United States</option>
                <option value="RO">Romania</option>
                <option value="EE">Estonia</option>
                <option value="FR">France</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                This affects revenue calculations and tax reporting
              </p>
            </div>
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
          </form>
        </CardContent>
      </Card>

      {/* Current Level */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <CardTitle>Agency Level</CardTitle>
          </div>
          <CardDescription>Your current progression status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">Level {agency?.current_level || 1}</span>
              <Badge className="bg-primary">
                {agency?.current_level === 1 && 'The Ghost'}
                {agency?.current_level === 5 && 'The Seed'}
                {agency?.current_level === 15 && 'The Farmer'}
                {agency?.current_level === 20 && 'The Cloner'}
                {agency?.current_level === 50 && 'The Whale'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to next level</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary w-[65%]" />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-2">Next unlock at Level 5:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Backup Instagram account tracking</li>
                <li>• Advanced analytics dashboard</li>
                <li>• Custom reporting tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle>Tax Information</CardTitle>
          </div>
          <CardDescription>Current tax rates for your jurisdiction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Platform Fee (Fanvue)</span>
              <span className="font-semibold">20%</span>
            </div>
            {agency?.tax_jurisdiction === 'RO' && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Revenue Tax</span>
                  <span className="font-semibold">3%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Dividend Tax</span>
                  <span className="font-semibold">8%</span>
                </div>
              </>
            )}
            {agency?.tax_jurisdiction === 'US' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Corporate Tax</span>
                <span className="font-semibold">0% (Pass-through LLC)</span>
              </div>
            )}
            {agency?.tax_jurisdiction === 'EE' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Corporate Tax</span>
                <span className="font-semibold">0% (Reinvested) / 20% (Distributed)</span>
              </div>
            )}
            {agency?.tax_jurisdiction === 'FR' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Corporate Tax</span>
                <span className="font-semibold">25%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
