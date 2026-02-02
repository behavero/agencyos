'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users } from 'lucide-react'

interface SegmentCriteria {
  status?: 'active' | 'expired' | 'all'
  total_spend_min?: number
  total_spend_max?: number
  days_since_last_activity_min?: number
  days_since_last_activity_max?: number
  is_vip?: boolean
  tags?: string[]
}

interface SegmentBuilderProps {
  modelId: string
  onSegmentChange?: (criteria: SegmentCriteria, estimatedCount: number) => void
  initialCriteria?: SegmentCriteria
}

export function SegmentBuilder({ modelId, onSegmentChange, initialCriteria }: SegmentBuilderProps) {
  const [criteria, setCriteria] = useState<SegmentCriteria>(
    initialCriteria || {
      status: 'all',
    }
  )
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Debounced preview
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview()
    }, 500)

    return () => clearTimeout(timer)
  }, [criteria, modelId])

  const fetchPreview = async () => {
    if (!modelId) return

    setLoading(true)
    try {
      const response = await fetch('/api/marketing/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          criteria,
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch preview')

      const data = await response.json()
      setEstimatedCount(data.count)
      onSegmentChange?.(criteria, data.count)
    } catch (error) {
      console.error('Preview error:', error)
      setEstimatedCount(null)
    } finally {
      setLoading(false)
    }
  }

  const updateCriteria = (key: keyof SegmentCriteria, value: unknown) => {
    setCriteria(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const removeCriteria = (key: keyof SegmentCriteria) => {
    setCriteria(prev => {
      const newCriteria = { ...prev }
      delete newCriteria[key]
      return newCriteria
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Targeting</CardTitle>
        <CardDescription>Define who will receive this campaign</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Status */}
        <div className="space-y-2">
          <Label>Subscription Status</Label>
          <Select
            value={criteria.status || 'all'}
            onValueChange={value => updateCriteria('status', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fans</SelectItem>
              <SelectItem value="active">Active Subscribers Only</SelectItem>
              <SelectItem value="expired">Expired Subscribers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Spending Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Spend ($)</Label>
            <Input
              type="number"
              placeholder="0"
              min="0"
              value={criteria.total_spend_min || ''}
              onChange={e =>
                updateCriteria(
                  'total_spend_min',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Spend ($)</Label>
            <Input
              type="number"
              placeholder="Unlimited"
              min="0"
              value={criteria.total_spend_max || ''}
              onChange={e =>
                updateCriteria(
                  'total_spend_max',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
        </div>

        {/* Activity Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Inactive For (Days)</Label>
            <Input
              type="number"
              placeholder="Any"
              min="0"
              value={criteria.days_since_last_activity_min || ''}
              onChange={e =>
                updateCriteria(
                  'days_since_last_activity_min',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Active Within (Days)</Label>
            <Input
              type="number"
              placeholder="Any"
              min="0"
              value={criteria.days_since_last_activity_max || ''}
              onChange={e =>
                updateCriteria(
                  'days_since_last_activity_max',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>
        </div>

        {/* VIP Status */}
        <div className="space-y-2">
          <Label>VIP Status</Label>
          <Select
            value={
              criteria.is_vip === undefined ? 'all' : criteria.is_vip ? 'vip_only' : 'non_vip_only'
            }
            onValueChange={value =>
              updateCriteria('is_vip', value === 'all' ? undefined : value === 'vip_only')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select VIP status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fans</SelectItem>
              <SelectItem value="vip_only">VIP Only</SelectItem>
              <SelectItem value="non_vip_only">Non-VIP Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Estimated Audience:</span>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant="secondary" className="text-lg font-semibold">
                {estimatedCount !== null ? estimatedCount.toLocaleString() : '—'} Fans
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
