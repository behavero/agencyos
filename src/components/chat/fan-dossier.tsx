'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  DollarSign,
  User,
  Brain,
  Edit3,
  Check,
  X,
  RefreshCw,
  Star,
  AlertTriangle,
  Crown,
  Target,
  MapPin,
  Briefcase,
  Heart,
  Calendar,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Ban,
} from 'lucide-react'

interface FanInsights {
  id: string
  fan_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  custom_attributes: Record<string, string | number>
  total_spend: number
  avg_tip: number
  tip_count: number
  ppv_unlocked: number
  ppv_sent: number
  subscription_months: number
  tags: string[]
  notes: string | null
  ai_summary: string | null
  ai_summary_updated_at: string | null
  first_seen_at: string
  last_active_at: string
  message_count: number
  is_blocked: boolean
  is_vip: boolean
  whaleScore: number
  ppvUnlockRate: number
}

interface FanDossierProps {
  fanId: string
  modelId: string
  fanName?: string
  messages?: Array<{ role: string; content: string }>
  onClose?: () => void
}

// Predefined attribute fields
const ATTRIBUTE_FIELDS = [
  { key: 'name', label: 'Name', icon: User },
  { key: 'age', label: 'Age', icon: Calendar },
  { key: 'city', label: 'City', icon: MapPin },
  { key: 'job', label: 'Job', icon: Briefcase },
  { key: 'fetish', label: 'Interests', icon: Heart },
]

// Tag presets
const TAG_PRESETS = [
  { label: '🐋 Whale', value: 'Whale', color: 'bg-green-500/20 text-green-400' },
  { label: '⭐ VIP', value: 'VIP', color: 'bg-yellow-500/20 text-yellow-400' },
  { label: '💎 High Roller', value: 'HighRoller', color: 'bg-purple-500/20 text-purple-400' },
  { label: '⏰ Time Waster', value: 'TimeWaster', color: 'bg-red-500/20 text-red-400' },
  { label: '🆕 New', value: 'New', color: 'bg-blue-500/20 text-blue-400' },
  { label: '💬 Chatty', value: 'Chatty', color: 'bg-cyan-500/20 text-cyan-400' },
]

export function FanDossier({ fanId, modelId, fanName, messages, onClose }: FanDossierProps) {
  const [fan, setFan] = useState<FanInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Fetch fan data
  const fetchFan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/fans/${fanId}?model_id=${modelId}`)
      if (response.ok) {
        const data = await response.json()
        setFan(data.fan)
        setIsNew(data.isNew)
        setNotes(data.fan?.notes || '')
      }
    } catch (error) {
      console.error('Error fetching fan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (fanId && modelId) {
      fetchFan()
    }
  }, [fanId, modelId])

  // Save attribute
  const saveAttribute = async (key: string, value: string) => {
    try {
      const response = await fetch(`/api/fans/${fanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          custom_attributes: { [key]: value },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFan(data.fan)
        toast.success('Saved!')
      }
    } catch (error) {
      toast.error('Failed to save')
    }
    setEditingField(null)
  }

  // Save notes
  const saveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const response = await fetch(`/api/fans/${fanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          notes,
        }),
      })

      if (response.ok) {
        toast.success('Notes saved!')
      }
    } catch (error) {
      toast.error('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Toggle tag
  const toggleTag = async (tag: string) => {
    const currentTags = fan?.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]

    try {
      const response = await fetch(`/api/fans/${fanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          tags: newTags,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFan(data.fan)
      }
    } catch (error) {
      toast.error('Failed to update tags')
    }
  }

  // Generate AI summary
  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const response = await fetch(`/api/fans/${fanId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          messages: messages || [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFan(prev => prev ? { ...prev, ai_summary: data.summary } : null)
        toast.success('Summary generated!')
      }
    } catch (error) {
      toast.error('Failed to generate summary')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Get whale tier
  const getWhaleTier = (score: number) => {
    if (score >= 80) return { label: 'MEGA WHALE', color: 'text-green-400', bg: 'bg-green-500/20' }
    if (score >= 60) return { label: 'WHALE', color: 'text-blue-400', bg: 'bg-blue-500/20' }
    if (score >= 40) return { label: 'DOLPHIN', color: 'text-cyan-400', bg: 'bg-cyan-500/20' }
    if (score >= 20) return { label: 'FISH', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
    return { label: 'MINNOW', color: 'text-zinc-400', bg: 'bg-zinc-500/20' }
  }

  if (isLoading) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-zinc-800 rounded-lg" />
          <div className="h-32 bg-zinc-800 rounded-lg" />
          <div className="h-24 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    )
  }

  const whaleTier = getWhaleTier(fan?.whaleScore || 0)

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Fan Dossier
          </h3>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-zinc-400 mt-1">{fanName || fan?.username || fanId}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Financials - The Whale Score */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Whale Score */}
            <div className={`p-3 rounded-lg ${whaleTier.bg} text-center`}>
              <div className={`text-2xl font-bold ${whaleTier.color}`}>
                {fan?.whaleScore || 0}
              </div>
              <Badge variant="outline" className={whaleTier.color}>
                {whaleTier.label}
              </Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-zinc-800 rounded p-2">
                <div className="text-zinc-400">Total Spent</div>
                <div className={`font-bold ${(fan?.total_spend || 0) >= 100 ? 'text-green-400' : 'text-white'}`}>
                  ${(fan?.total_spend || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-zinc-800 rounded p-2">
                <div className="text-zinc-400">Avg Tip</div>
                <div className="font-bold text-white">
                  ${(fan?.avg_tip || 0).toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-800 rounded p-2">
                <div className="text-zinc-400">PPV Rate</div>
                <div className={`font-bold ${(fan?.ppvUnlockRate || 0) >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {fan?.ppvUnlockRate || 0}%
                </div>
              </div>
              <div className="bg-zinc-800 rounded p-2">
                <div className="text-zinc-400">Tips</div>
                <div className="font-bold text-white">
                  {fan?.tip_count || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity - The CRM */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ATTRIBUTE_FIELDS.map(({ key, label, icon: Icon }) => {
              const value = fan?.custom_attributes?.[key] || ''
              const isEditing = editingField === key

              return (
                <div key={key} className="flex items-center gap-2 group">
                  <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400 w-16">{label}:</span>
                  
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-sm bg-zinc-700 border-zinc-600"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAttribute(key, editValue)
                          if (e.key === 'Escape') setEditingField(null)
                        }}
                      />
                      <Button
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveAttribute(key, editValue)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingField(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex-1 text-sm text-white cursor-pointer hover:bg-zinc-700/50 rounded px-2 py-1 flex items-center justify-between group"
                      onClick={() => {
                        setEditingField(key)
                        setEditValue(value?.toString() || '')
                      }}
                    >
                      <span>{value || '—'}</span>
                      <Edit3 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TAG_PRESETS.map((tag) => {
                const isActive = fan?.tags?.includes(tag.value)
                return (
                  <Badge
                    key={tag.value}
                    variant="outline"
                    className={`cursor-pointer transition-all ${
                      isActive ? tag.color : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                    onClick={() => toggleTag(tag.value)}
                  >
                    {tag.label}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Intelligence */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                AI Summary
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={generateSummary}
                disabled={isGeneratingSummary}
                className="h-7 text-xs"
              >
                {isGeneratingSummary ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                {isGeneratingSummary ? 'Analyzing...' : 'Generate'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fan?.ai_summary ? (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                {fan.ai_summary}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 italic">
                Click Generate to analyze chat history
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Private Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about this fan..."
              className="bg-zinc-700 border-zinc-600 text-sm min-h-20"
            />
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={isSavingNotes}
              className="mt-2 w-full"
            >
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <div className="text-xs text-zinc-500 space-y-1">
          <div className="flex justify-between">
            <span>First seen:</span>
            <span>{fan?.first_seen_at ? new Date(fan.first_seen_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Last active:</span>
            <span>{fan?.last_active_at ? new Date(fan.last_active_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Messages:</span>
            <span>{fan?.message_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
