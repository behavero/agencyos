'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Calendar,
  Trash2,
  Edit2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  username: string | null
  role: string | null
}

interface Shift {
  id: string
  employee_id: string
  start_time: string
  end_time: string
  status: string
  title: string | null
  model_id: string | null
  employee?: { id: string; username: string; role: string }
}

interface PlanningClientProps {
  team: TeamMember[]
  initialShifts: Shift[]
  onlineEmployees: string[]
  weekStart: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function PlanningClient({
  team,
  initialShifts,
  onlineEmployees,
  weekStart: initialWeekStart,
}: PlanningClientProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [weekStart, setWeekStart] = useState(new Date(initialWeekStart))
  const [showDialog, setShowDialog] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    start_time: '20:00',
    end_time: '04:00',
    title: '',
  })

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return date
  })

  // Navigate weeks
  const navigateWeek = (direction: number) => {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + direction * 7)
    setWeekStart(newStart)
    fetchShifts(newStart)
  }

  const fetchShifts = async (start: Date) => {
    const end = new Date(start)
    end.setDate(start.getDate() + 7)

    try {
      const res = await fetch(
        `/api/shifts?start_date=${start.toISOString()}&end_date=${end.toISOString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setShifts(data.shifts || [])
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    }
  }

  // Get shifts for a specific employee on a specific day
  const getShiftsForCell = (employeeId: string, dayIndex: number) => {
    const dayStart = new Date(weekDates[dayIndex])
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)

    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_time)
      return (
        shift.employee_id === employeeId &&
        shiftStart >= dayStart &&
        shiftStart < dayEnd
      )
    })
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // Open add shift dialog
  const openAddDialog = (employeeId: string, dayIndex: number) => {
    setSelectedEmployee(employeeId)
    setSelectedDay(dayIndex)
    setEditingShift(null)
    setFormData({
      employee_id: employeeId,
      start_time: '20:00',
      end_time: '04:00',
      title: 'Night Shift',
    })
    setShowDialog(true)
  }

  // Open edit shift dialog
  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      employee_id: shift.employee_id,
      start_time: formatTime(shift.start_time),
      end_time: formatTime(shift.end_time),
      title: shift.title || '',
    })
    setShowDialog(true)
  }

  // Create or update shift
  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (editingShift) {
        // Update
        const shiftDate = new Date(editingShift.start_time)
        const [startHour, startMin] = formData.start_time.split(':')
        const [endHour, endMin] = formData.end_time.split(':')

        const startTime = new Date(shiftDate)
        startTime.setHours(parseInt(startHour), parseInt(startMin))

        const endTime = new Date(shiftDate)
        endTime.setHours(parseInt(endHour), parseInt(endMin))
        // If end time is before start time, it's the next day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1)
        }

        const res = await fetch(`/api/shifts/${editingShift.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            title: formData.title,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setShifts(prev =>
            prev.map(s => (s.id === editingShift.id ? data.shift : s))
          )
        }
      } else {
        // Create
        const shiftDate = weekDates[selectedDay!]
        const [startHour, startMin] = formData.start_time.split(':')
        const [endHour, endMin] = formData.end_time.split(':')

        const startTime = new Date(shiftDate)
        startTime.setHours(parseInt(startHour), parseInt(startMin))

        const endTime = new Date(shiftDate)
        endTime.setHours(parseInt(endHour), parseInt(endMin))
        // If end time is before start time, it's the next day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1)
        }

        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: formData.employee_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            title: formData.title,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setShifts(prev => [...prev, data.shift])
        }
      }
      setShowDialog(false)
    } catch (error) {
      console.error('Failed to save shift:', error)
    } finally {
      setLoading(false)
    }
  }

  // Delete shift
  const handleDelete = async (shiftId: string) => {
    if (!confirm('Delete this shift?')) return

    try {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' })
      if (res.ok) {
        setShifts(prev => prev.filter(s => s.id !== shiftId))
      }
    } catch (error) {
      console.error('Failed to delete shift:', error)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'completed':
        return 'bg-zinc-500/20 border-zinc-500/50 text-zinc-400'
      case 'missed':
        return 'bg-red-500/20 border-red-500/50 text-red-400'
      case 'cancelled':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400'
      default:
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400'
    }
  }

  // Format week range
  const formatWeekRange = () => {
    const endOfWeek = new Date(weekStart)
    endOfWeek.setDate(weekStart.getDate() + 6)
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}, ${endOfWeek.getFullYear()}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shift Planning</h1>
          <p className="text-muted-foreground">Schedule and manage team shifts</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700 min-w-[200px] text-center">
            <span className="font-medium">{formatWeekRange()}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-zinc-500" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Missed</span>
        </div>
      </div>

      {/* Planning Grid */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-48 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider bg-zinc-800/50 sticky left-0">
                  Employee
                </th>
                {weekDates.map((date, i) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <th
                      key={i}
                      className={cn(
                        'px-3 py-3 text-center min-w-[140px]',
                        isToday && 'bg-primary/10'
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {DAYS[i]}
                      </div>
                      <div className={cn(
                        'text-lg font-bold',
                        isToday ? 'text-primary' : 'text-foreground'
                      )}>
                        {date.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {team.map(member => {
                const isOnline = onlineEmployees.includes(member.id)
                return (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-3 sticky left-0 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-zinc-400" />
                          </div>
                          {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">
                            {member.username || 'Unknown'}
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date, dayIndex) => {
                      const cellShifts = getShiftsForCell(member.id, dayIndex)
                      const isToday = date.toDateString() === new Date().toDateString()
                      
                      return (
                        <td
                          key={dayIndex}
                          className={cn(
                            'px-2 py-2 relative min-h-[80px] align-top',
                            isToday && 'bg-primary/5'
                          )}
                        >
                          <div className="space-y-1.5">
                            {cellShifts.map(shift => (
                              <div
                                key={shift.id}
                                className={cn(
                                  'group px-2 py-1.5 rounded border cursor-pointer transition-all hover:scale-[1.02]',
                                  getStatusColor(shift.status)
                                )}
                                onClick={() => openEditDialog(shift)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium">
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(shift.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                                {shift.title && (
                                  <div className="text-[10px] opacity-75 truncate">
                                    {shift.title}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Add shift button */}
                            <button
                              onClick={() => openAddDialog(member.id, dayIndex)}
                              className="w-full py-1 rounded border border-dashed border-zinc-700 text-zinc-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1 text-xs"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty state */}
      {team.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Team Members</h3>
            <p className="text-muted-foreground">
              Add team members first to start scheduling shifts.
            </p>
          </div>
        </Card>
      )}

      {/* Add/Edit Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Edit Shift' : 'Add Shift'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shift Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Night Shift"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {!editingShift && (
              <p className="text-xs text-muted-foreground">
                For {team.find(m => m.id === formData.employee_id)?.username || 'selected employee'} on{' '}
                {selectedDay !== null ? FULL_DAYS[selectedDay] : ''},{' '}
                {selectedDay !== null ? weekDates[selectedDay].toLocaleDateString() : ''}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : editingShift ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
