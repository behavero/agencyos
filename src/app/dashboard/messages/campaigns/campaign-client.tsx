'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Send,
  Users,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Target,
  Zap,
  CalendarClock,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Model {
  id: string
  name: string
  subscribers_count: number | null
  followers_count: number | null
}

interface Campaign {
  id: string
  name: string
  message_content: string
  segment_type: string
  target_count: number
  sent_count: number
  status: string
  created_at: string
  model_id: string
}

interface VaultAsset {
  id: string
  title: string | null
  file_name: string
  url: string
  file_type: string
  price: number
  content_type: string
}

interface CampaignClientProps {
  models: Model[]
  campaigns: Campaign[]
  vaultAssets: VaultAsset[]
  agencyId: string
}

const SEGMENTS = [
  { id: 'all', name: 'All Fans', icon: Users, description: 'Send to everyone', multiplier: 1 },
  { id: 'whales', name: 'Whales ($100+)', icon: Crown, description: 'Top spenders', multiplier: 0.05 },
  { id: 'new', name: 'New Fans (7 days)', icon: Zap, description: 'Recent subscribers', multiplier: 0.15 },
  { id: 'inactive', name: 'Inactive (30+ days)', icon: Clock, description: 'Re-engagement', multiplier: 0.3 },
]

export function CampaignClient({ models, campaigns, vaultAssets, agencyId }: CampaignClientProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('create')
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  
  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    modelId: '',
    segment: 'all',
    message: '',
    attachments: [] as VaultAsset[],
    price: null as number | null,
    scheduleFor: '',
  })

  // Calculate target count
  const selectedModel = models.find(m => m.id === campaignForm.modelId)
  const baseCount = selectedModel?.subscribers_count || 0
  const segment = SEGMENTS.find(s => s.id === campaignForm.segment)
  const targetCount = Math.round(baseCount * (segment?.multiplier || 1))

  // Add attachment from vault
  const addAttachment = (asset: VaultAsset) => {
    if (campaignForm.attachments.find(a => a.id === asset.id)) {
      toast.error('Already attached')
      return
    }
    setCampaignForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, asset],
    }))
    setIsVaultOpen(false)
    toast.success('Attachment added')
  }

  // Remove attachment
  const removeAttachment = (assetId: string) => {
    setCampaignForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== assetId),
    }))
  }

  // Launch campaign
  const launchCampaign = async () => {
    if (!campaignForm.modelId) {
      toast.error('Please select a model')
      return
    }
    if (!campaignForm.message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsLaunching(true)

    try {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          agency_id: agencyId,
          model_id: campaignForm.modelId,
          name: campaignForm.name || `Campaign ${new Date().toLocaleDateString()}`,
          message_content: campaignForm.message,
          segment_type: campaignForm.segment,
          segment_config: { segment: campaignForm.segment },
          target_count: targetCount,
          content_asset_ids: campaignForm.attachments.map(a => a.id),
          price: campaignForm.price,
          scheduled_at: campaignForm.scheduleFor || null,
          status: campaignForm.scheduleFor ? 'scheduled' : 'queued',
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Add to mass_messages queue if launching now
      if (!campaignForm.scheduleFor) {
        const { error: queueError } = await supabase
          .from('mass_messages')
          .insert({
            model_id: campaignForm.modelId,
            content: campaignForm.message,
            media_ids: campaignForm.attachments.map(a => a.url),
            price: campaignForm.price,
            included_lists: { segment: campaignForm.segment },
            status: 'pending',
            created_by: (await supabase.auth.getUser()).data.user?.id,
          })

        if (queueError) {
          console.error('Queue error:', queueError)
        }
      }

      toast.success(
        campaignForm.scheduleFor 
          ? 'Campaign scheduled!' 
          : 'Campaign queued for sending!'
      )

      // Reset form
      setCampaignForm({
        name: '',
        modelId: '',
        segment: 'all',
        message: '',
        attachments: [],
        price: null,
        scheduleFor: '',
      })

      setActiveTab('history')
    } catch (error) {
      console.error('Launch error:', error)
      toast.error('Failed to launch campaign')
    } finally {
      setIsLaunching(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>
      case 'queued':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>
      case 'scheduled':
        return <Badge className="bg-purple-500/20 text-purple-400"><CalendarClock className="w-3 h-3 mr-1" /> Scheduled</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaign Manager</h1>
          <p className="text-muted-foreground">
            Create and manage mass message campaigns
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            History ({campaigns.length})
          </TabsTrigger>
        </TabsList>

        {/* Create Campaign */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Select Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                    Select Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={campaignForm.modelId}
                    onValueChange={(v) => setCampaignForm({ ...campaignForm, modelId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a model to send from..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({(model.subscribers_count || 0).toLocaleString()} subscribers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Step 2: Segmentation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                    Target Audience
                  </CardTitle>
                  <CardDescription>
                    Who should receive this message?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SEGMENTS.map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => setCampaignForm({ ...campaignForm, segment: seg.id })}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          campaignForm.segment === seg.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <seg.icon className={cn(
                          "w-5 h-5 mb-2",
                          campaignForm.segment === seg.id ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className="font-medium text-sm">{seg.name}</p>
                        <p className="text-xs text-muted-foreground">{seg.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                    Compose Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name (optional)</Label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      placeholder="e.g., Valentine's Day Special"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={campaignForm.message}
                      onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                      placeholder="Hey babe 💕 I just uploaded something special for you..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {campaignForm.message.length}/5000
                    </p>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label>Attachments</Label>
                    <div className="flex flex-wrap gap-2">
                      {campaignForm.attachments.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm">{asset.title || asset.file_name}</span>
                          {asset.price > 0 && (
                            <Badge variant="outline" className="text-xs">${asset.price}</Badge>
                          )}
                          <button
                            onClick={() => removeAttachment(asset.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsVaultOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add from Vault
                      </Button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>PPV Price (optional)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={campaignForm.price || ''}
                          onChange={(e) => setCampaignForm({
                            ...campaignForm,
                            price: e.target.value ? parseFloat(e.target.value) : null
                          })}
                          placeholder="0.00"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Schedule (optional)</Label>
                      <Input
                        type="datetime-local"
                        value={campaignForm.scheduleFor}
                        onChange={(e) => setCampaignForm({ ...campaignForm, scheduleFor: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Campaign Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target Stats */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Targeting</p>
                    <p className="text-3xl font-bold text-primary">
                      {targetCount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {segment?.name || 'fans'}
                    </p>
                  </div>

                  {/* Message Preview */}
                  {campaignForm.message && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Message Preview</p>
                      <div className="p-3 rounded-lg bg-secondary text-sm">
                        {campaignForm.message.slice(0, 150)}
                        {campaignForm.message.length > 150 && '...'}
                      </div>
                    </div>
                  )}

                  {/* Attachments Preview */}
                  {campaignForm.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {campaignForm.attachments.length} attachment(s)
                      </p>
                      <div className="flex gap-2">
                        {campaignForm.attachments.slice(0, 3).map((asset) => (
                          <div key={asset.id} className="w-12 h-12 rounded bg-muted overflow-hidden">
                            {asset.file_type === 'image' ? (
                              <img src={asset.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Revenue Estimate */}
                  {campaignForm.price && campaignForm.price > 0 && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-muted-foreground">Potential Revenue</p>
                      <p className="text-2xl font-bold text-green-400">
                        ${(targetCount * campaignForm.price * 0.1).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @ 10% conversion rate
                      </p>
                    </div>
                  )}

                  {/* Launch Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={launchCampaign}
                    disabled={isLaunching || !campaignForm.modelId || !campaignForm.message}
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Launching...
                      </>
                    ) : campaignForm.scheduleFor ? (
                      <>
                        <CalendarClock className="w-4 h-4 mr-2" />
                        Schedule Campaign
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Launch Campaign
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Campaign History */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <div className="py-16 text-center">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first campaign to reach your fans
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {campaign.message_content.slice(0, 50)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {campaign.sent_count}/{campaign.target_count} sent
                        </p>
                        <Progress 
                          value={(campaign.sent_count / campaign.target_count) * 100}
                          className="w-24 h-2 mt-1"
                        />
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vault Modal */}
      <Dialog open={isVaultOpen} onOpenChange={setIsVaultOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Vault</DialogTitle>
            <DialogDescription>
              Choose content to attach to your campaign
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto py-4">
            {vaultAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => addAttachment(asset)}
                className={cn(
                  "aspect-square rounded-lg overflow-hidden border transition-all hover:border-primary",
                  campaignForm.attachments.find(a => a.id === asset.id)
                    ? "border-primary ring-2 ring-primary"
                    : "border-border"
                )}
              >
                {asset.file_type === 'image' ? (
                  <img src={asset.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
            {vaultAssets.length === 0 && (
              <div className="col-span-3 py-8 text-center text-muted-foreground">
                No assets in vault. Upload some content first.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVaultOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
