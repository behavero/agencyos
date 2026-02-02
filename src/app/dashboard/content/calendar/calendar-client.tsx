'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Youtube,
  Clock,
  Check,
  AlertCircle,
  Lightbulb,
  FileEdit,
  X,
  MoreVertical,
  Trash2,
} from 'lucide-react'

interface ContentTask {
  id: string
  title: string
  caption: string | null
  media_url: string | null
  notes: string | null
  platform: string
  content_type: string
  status: string
  scheduled_at: string | null
  posted_at: string | null
  model_id: string | null
  assignee_id: string | null
  priority: string
  model?: { id: string; name: string } | null
  assignee?: { id: string; username: string } | null
}

interface CalendarClientProps {
  agencyId: string
  models: Array<{ id: string; name: string }>
  teamMembers: Array<{ id: string; username: string; role: string | null }>
}

// Platform icons
const PlatformIcon = ({ platform, className = "w-4 h-4" }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className={`${className} text-pink-400`} />
    case 'youtube':
      return <Youtube className={`${className} text-red-400`} />
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className={`${className} text-cyan-400`} fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    case 'x':
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" className={`${className} text-zinc-300`} fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    case 'fanvue':
      return <span className={`${className} text-purple-400 font-bold`}>FV</span>
    default:
      return <FileEdit className={className} />
  }
}

// Status colors and icons
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  idea: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', icon: <Lightbulb className="w-3 h-3" /> },
  draft: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <FileEdit className="w-3 h-3" /> },
  scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Clock className="w-3 h-3" /> },
  posted: { color: 'text-green-400', bg: 'bg-green-500/20', icon: <Check className="w-3 h-3" /> },
  missed: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', icon: <X className="w-3 h-3" /> },
}

// Days of week
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarClient({ agencyId, models, teamMembers }: CalendarClientProps) {
  const [tasks, setTasks] = useState<ContentTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<ContentTask | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    platform: 'instagram',
    content_type: 'post',
    status: 'scheduled',
    scheduled_at: '',
    model_id: '',
    assignee_id: '',
    priority: 'normal',
    notes: '',
  })

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()
    
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      })
    }
    
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }
    
    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }
    
    return days
  }, [currentDate])

  // Fetch tasks
  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString()
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const response = await fetch(
        `/api/content/tasks?start_date=${startDate}&end_date=${endDate}`
      )
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [currentDate])

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): ContentTask[] => {
    return tasks.filter(task => {
      if (!task.scheduled_at) return false
      const taskDate = new Date(task.scheduled_at)
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      )
    })
  }

  // Handle add task
  const handleAddTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/content/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          model_id: formData.model_id || null,
          assignee_id: formData.assignee_id || null,
          scheduled_at: formData.scheduled_at || null,
        }),
      })

      if (response.ok) {
        toast.success('Task created! 📝')
        setIsAddDialogOpen(false)
        resetForm()
        fetchTasks()
      } else {
        toast.error('Failed to create task')
      }
    } catch (error) {
      toast.error('Failed to create task')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle update task
  const handleUpdateTask = async () => {
    if (!selectedTask) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/content/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          model_id: formData.model_id || null,
          assignee_id: formData.assignee_id || null,
          scheduled_at: formData.scheduled_at || null,
        }),
      })

      if (response.ok) {
        toast.success('Task updated! ✅')
        setIsEditDialogOpen(false)
        setSelectedTask(null)
        resetForm()
        fetchTasks()
      } else {
        toast.error('Failed to update task')
      }
    } catch (error) {
      toast.error('Failed to update task')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return

    try {
      const response = await fetch(`/api/content/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Task deleted')
        setIsEditDialogOpen(false)
        setSelectedTask(null)
        fetchTasks()
      }
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  // Handle quick status update
  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/content/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success(newStatus === 'posted' ? 'Marked as posted! ✅' : 'Status updated')
        fetchTasks()
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      caption: '',
      platform: 'instagram',
      content_type: 'post',
      status: 'scheduled',
      scheduled_at: '',
      model_id: '',
      assignee_id: '',
      priority: 'normal',
      notes: '',
    })
  }

  // Open add dialog for specific date
  const openAddDialog = (date?: Date) => {
    resetForm()
    if (date) {
      const dateStr = date.toISOString().slice(0, 16)
      setFormData(prev => ({ ...prev, scheduled_at: dateStr }))
    }
    setIsAddDialogOpen(true)
  }

  // Open edit dialog
  const openEditDialog = (task: ContentTask) => {
    setSelectedTask(task)
    setFormData({
      title: task.title,
      caption: task.caption || '',
      platform: task.platform,
      content_type: task.content_type,
      status: task.status,
      scheduled_at: task.scheduled_at ? task.scheduled_at.slice(0, 16) : '',
      model_id: task.model_id || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority,
      notes: task.notes || '',
    })
    setIsEditDialogOpen(true)
  }

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Content Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan and track your content across all platforms
          </p>
        </div>

        <Button onClick={() => openAddDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Content
        </Button>
      </div>

      {/* Calendar Navigation */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-white min-w-48 text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-zinc-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayTasks = getTasksForDate(day.date)
              const isToday = day.date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-28 p-2 rounded-lg border transition-all cursor-pointer
                    ${day.isCurrentMonth ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500' : 'bg-zinc-900/30 border-zinc-800/50'}
                    ${isToday ? 'ring-2 ring-primary/50' : ''}
                  `}
                  onClick={() => openAddDialog(day.date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    day.isCurrentMonth ? (isToday ? 'text-primary' : 'text-white') : 'text-zinc-600'
                  }`}>
                    {day.date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => {
                      const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.idea
                      return (
                        <div
                          key={task.id}
                          className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate
                            ${statusConfig.bg} ${statusConfig.color}
                            hover:ring-1 hover:ring-white/20
                          `}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(task)
                          }}
                        >
                          <PlatformIcon platform={task.platform} className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-zinc-500 pl-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${config.bg}`} />
            <span className={`text-sm ${config.color} capitalize`}>{status}</span>
          </div>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add Content</DialogTitle>
            <DialogDescription>
              Schedule a new post or content piece
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Morning Routine Reel"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">📸 Instagram</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                    <SelectItem value="youtube">📺 YouTube</SelectItem>
                    <SelectItem value="x">𝕏 X/Twitter</SelectItem>
                    <SelectItem value="fanvue">💜 Fanvue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(v) => setFormData({ ...formData, content_type: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="ppv">PPV</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={formData.model_id}
                  onValueChange={(v) => setFormData({ ...formData, model_id: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Write your caption..."
                className="bg-zinc-800 border-zinc-700 min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes for the team"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>Edit Content</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300"
                onClick={() => selectedTask && handleDeleteTask(selectedTask.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(v) => setFormData({ ...formData, platform: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">📸 IG</SelectItem>
                    <SelectItem value="tiktok">🎵 TT</SelectItem>
                    <SelectItem value="youtube">📺 YT</SelectItem>
                    <SelectItem value="x">𝕏 X</SelectItem>
                    <SelectItem value="fanvue">💜 FV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(v) => setFormData({ ...formData, content_type: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="ppv">PPV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">💡 Idea</SelectItem>
                    <SelectItem value="draft">📝 Draft</SelectItem>
                    <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                    <SelectItem value="posted">✅ Posted</SelectItem>
                    <SelectItem value="missed">❌ Missed</SelectItem>
                    <SelectItem value="cancelled">🚫 Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={formData.model_id}
                  onValueChange={(v) => setFormData({ ...formData, model_id: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                className="bg-zinc-800 border-zinc-700 min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {formData.status !== 'posted' && (
                <Button
                  variant="outline"
                  className="text-green-400 border-green-500/30"
                  onClick={() => {
                    if (selectedTask) {
                      handleStatusUpdate(selectedTask.id, 'posted')
                      setIsEditDialogOpen(false)
                    }
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark Posted
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTask} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
