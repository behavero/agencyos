'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SegmentBuilder } from '@/components/marketing/segment-builder'
import { Plus, Send, Clock, CheckCircle, XCircle, Loader2, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  status: string
  stats: {
    sent: number
    opened: number
    revenue: number
    failed: number
  }
  scheduled_for: string | null
  created_at: string
  model: { id: string; name: string; avatar_url: string | null }
  segment: { id: string; name: string } | null
}

interface Segment {
  id: string
  name: string
  description: string | null
  estimated_count: number
}

interface Model {
  id: string
  name: string
  avatar_url: string | null
}

interface MarketingClientProps {
  initialCampaigns: Campaign[]
  initialSegments: Segment[]
  models: Model[]
  profile: { agency_id: string; role: string }
}

export default function MarketingClient({
  initialCampaigns,
  initialSegments,
  models,
  profile,
}: MarketingClientProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [segments] = useState<Segment[]>(initialSegments)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    model_id: '',
    segment_id: '',
    name: '',
    message_template: '',
    price: 0,
    scheduled_for: '',
  })
  const [estimatedReach, setEstimatedReach] = useState(0)
  const [segmentCriteria, setSegmentCriteria] = useState({})

  const handleCreateCampaign = async () => {
    if (!campaignForm.model_id || !campaignForm.name || !campaignForm.message_template) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // First, get fans matching the segment
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignForm,
          segment_criteria: segmentCriteria,
        }),
      })

      if (!response.ok) throw new Error('Failed to create campaign')

      const { campaign } = await response.json()
      setCampaigns([campaign, ...campaigns])
      setIsCreateOpen(false)
      setCampaignForm({
        model_id: '',
        segment_id: '',
        name: '',
        message_template: '',
        price: 0,
        scheduled_for: '',
      })
      toast.success('Campaign created successfully!')
    } catch (error) {
      console.error('Create campaign error:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
      running: 'default',
      completed: 'secondary',
      failed: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Automation</h1>
          <p className="text-muted-foreground">Mass DMs, Campaigns & Trigger-based Workflows</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Marketing Campaign</DialogTitle>
              <DialogDescription>
                Launch a mass DM campaign to a targeted segment of your fans
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Select
                  value={campaignForm.model_id}
                  onValueChange={value => setCampaignForm({ ...campaignForm, model_id: value })}
                >
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Valentine's Day PPV Blast"
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </div>

              {/* Segment Builder */}
              {campaignForm.model_id && (
                <SegmentBuilder
                  modelId={campaignForm.model_id}
                  onSegmentChange={(criteria, count) => {
                    setSegmentCriteria(criteria)
                    setEstimatedReach(count)
                  }}
                />
              )}

              {/* Message Template */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Hey babe! I just uploaded something special for you... 💕"
                  rows={4}
                  value={campaignForm.message_template}
                  onChange={e =>
                    setCampaignForm({ ...campaignForm, message_template: e.target.value })
                  }
                />
              </div>

              {/* PPV Price */}
              <div className="space-y-2">
                <Label htmlFor="price">PPV Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={campaignForm.price}
                  onChange={e =>
                    setCampaignForm({ ...campaignForm, price: Number(e.target.value) })
                  }
                />
              </div>

              {/* Revenue Estimate */}
              {estimatedReach > 0 && campaignForm.price > 0 && (
                <Card className="bg-purple-500/10 border-purple-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-muted-foreground">
                          Estimated Revenue Potential:
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-purple-400">
                        ${(estimatedReach * campaignForm.price * 0.15).toFixed(0)} - $
                        {(estimatedReach * campaignForm.price * 0.3).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Assuming 15-30% conversion rate
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Schedule */}
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule (Optional)</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={campaignForm.scheduled_for}
                  onChange={e =>
                    setCampaignForm({ ...campaignForm, scheduled_for: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">Leave empty to send immediately</p>
              </div>

              <Button onClick={handleCreateCampaign} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first marketing campaign to automate fan engagement
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map(campaign => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{campaign.name}</CardTitle>
                      {getStatusIcon(campaign.status)}
                    </div>
                    <CardDescription>
                      {campaign.model.name} • {campaign.segment?.name || 'Custom Audience'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress */}
                  {campaign.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {campaign.stats.sent} / {campaign.stats.sent + campaign.stats.failed} sent
                        </span>
                      </div>
                      <Progress
                        value={
                          (campaign.stats.sent /
                            (campaign.stats.sent + campaign.stats.failed || 1)) *
                          100
                        }
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{campaign.stats.sent}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{campaign.stats.opened}</div>
                      <div className="text-xs text-muted-foreground">Opened</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">
                        ${campaign.stats.revenue.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">{campaign.stats.failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
