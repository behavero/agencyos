'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Check,
  Sparkles,
  Target,
  DollarSign,
  HelpCircle,
  Heart,
  Star
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Script {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  usage_count: number
  conversion_rate: number
  is_favorite: boolean
  created_at: string
}

const scriptCategories = [
  { value: 'opener', label: 'Openers', icon: MessageSquare, color: 'text-blue-400' },
  { value: 'closer', label: 'Closers', icon: Target, color: 'text-green-400' },
  { value: 'upsell', label: 'Upsell', icon: DollarSign, color: 'text-amber-400' },
  { value: 'objection', label: 'Objections', icon: HelpCircle, color: 'text-orange-400' },
  { value: 'ppv', label: 'PPV', icon: Heart, color: 'text-pink-400' },
  { value: 'custom', label: 'Custom', icon: Sparkles, color: 'text-purple-400' },
]

export default function ScriptsClient({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast()
  const [scripts, setScripts] = useState<Script[]>([])
  const [grouped, setGrouped] = useState<Record<string, Script[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('opener')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('opener')
  const [formTags, setFormTags] = useState('')

  useEffect(() => {
    fetchScripts()
  }, [])

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/scripts')
      const data = await response.json()
      setScripts(data.scripts || [])
      setGrouped(data.grouped || {})
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyScript = async (script: Script) => {
    await navigator.clipboard.writeText(script.content)
    setCopiedId(script.id)
    
    // Track usage
    fetch(`/api/scripts/${script.id}`, { method: 'POST' }).catch(() => {})
    
    toast({ title: 'Script copied to clipboard!' })
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateScript = async () => {
    if (!formTitle || !formContent) {
      toast({ title: 'Please fill all fields', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      if (!response.ok) throw new Error()

      toast({ title: 'Script created!' })
      resetForm()
      fetchScripts()
    } catch (error) {
      toast({ title: 'Failed to create script', variant: 'destructive' })
    }
  }

  const handleUpdateScript = async () => {
    if (!editingScript) return

    try {
      const response = await fetch(`/api/scripts/${editingScript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      if (!response.ok) throw new Error()

      toast({ title: 'Script updated!' })
      resetForm()
      fetchScripts()
    } catch (error) {
      toast({ title: 'Failed to update script', variant: 'destructive' })
    }
  }

  const handleDeleteScript = async (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return

    try {
      const response = await fetch(`/api/scripts/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()

      toast({ title: 'Script deleted!' })
      fetchScripts()
    } catch (error) {
      toast({ title: 'Failed to delete script', variant: 'destructive' })
    }
  }

  const toggleFavorite = async (script: Script) => {
    try {
      await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !script.is_favorite }),
      })
      fetchScripts()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const resetForm = () => {
    setShowCreateDialog(false)
    setEditingScript(null)
    setFormTitle('')
    setFormContent('')
    setFormCategory('opener')
    setFormTags('')
  }

  const openEditDialog = (script: Script) => {
    setEditingScript(script)
    setFormTitle(script.title)
    setFormContent(script.content)
    setFormCategory(script.category)
    setFormTags(script.tags?.join(', ') || '')
    setShowCreateDialog(true)
  }

  const currentScripts = grouped[selectedCategory] || []

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            {scriptCategories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
                <cat.icon className={`w-4 h-4 ${cat.color}`} />
                {cat.label}
                <Badge variant="outline" className="ml-1">
                  {grouped[cat.value]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            if (!open) resetForm()
            setShowCreateDialog(open)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Script
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingScript ? 'Edit Script' : 'Create Script'}
                </DialogTitle>
                <DialogDescription>
                  {editingScript ? 'Update this chat script' : 'Add a new script to the arsenal'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="The 'Missing You' Opener"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scriptCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="spicy, valentines, morning"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Script Content</Label>
                  <Textarea
                    id="content"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Hey baby, I was just thinking about you..."
                    className="bg-zinc-800 border-zinc-700 min-h-[200px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={editingScript ? handleUpdateScript : handleCreateScript} 
                    className="bg-primary hover:bg-primary/90 text-black"
                  >
                    {editingScript ? 'Save Changes' : 'Create Script'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentScripts.map((script) => {
          const CategoryIcon = scriptCategories.find(c => c.value === script.category)?.icon || MessageSquare
          
          return (
            <Card key={script.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4 text-primary" />
                    <CardTitle className="text-white text-base">{script.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleFavorite(script)}
                  >
                    <Star className={`w-4 h-4 ${script.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                  </Button>
                </div>
                {script.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {script.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[100px]">
                  <p className="text-zinc-400 text-sm whitespace-pre-wrap">
                    {script.content}
                  </p>
                </ScrollArea>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>Used {script.usage_count}x</span>
                    {script.conversion_rate > 0 && (
                      <span className="text-green-400">
                        {(script.conversion_rate * 100).toFixed(1)}% conv
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyScript(script)}
                    >
                      {copiedId === script.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(script)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                          onClick={() => handleDeleteScript(script.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {currentScripts.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">No scripts in this category yet</p>
            {isAdmin && (
              <Button 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Script
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
