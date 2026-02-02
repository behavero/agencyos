'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Play, 
  Square, 
  Flame,
  AlertCircle,
  Timer,
  CalendarClock
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TimeClockStatus {
  status: 'no_shift' | 'upcoming' | 'can_clock_in' | 'working' | 'overtime'
  activeTimesheet: {
    id: string
    clock_in: string
    shift_id: string | null
  } | null
  currentShift: {
    id: string
    start_time: string
    end_time: string
    title: string | null
  } | null
  nextShift: {
    id: string
    start_time: string
    end_time: string
    title: string | null
  } | null
  elapsedMinutes: number
  role: string
}

export function TimeClock() {
  const [status, setStatus] = useState<TimeClockStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/timeclock')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        if (data.elapsedMinutes) {
          setElapsedTime(data.elapsedMinutes)
        }
      }
    } catch (error) {
      console.error('Failed to fetch time clock status:', error)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Refresh every minute
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Live timer when working
  useEffect(() => {
    if (status?.status === 'working' || status?.status === 'overtime') {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 60000) // Update every minute
      return () => clearInterval(timer)
    }
  }, [status?.status])

  const handleAction = async (action: 'clock_in' | 'clock_out') => {
    setLoading(true)
    try {
      const res = await fetch('/api/timeclock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      
      if (res.ok) {
        await fetchStatus()
      } else {
        const error = await res.json()
        console.error('Time clock action failed:', error)
      }
    } catch (error) {
      console.error('Time clock action error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatShiftTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMinutesUntilShift = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    return Math.max(0, Math.floor((start.getTime() - now.getTime()) / 60000))
  }

  // Don't render for owners or if no status
  if (!status || status.role === 'owner') {
    return null
  }

  // No shift scheduled
  if (status.status === 'no_shift') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-500">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-medium">No Shift</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No shifts scheduled for today</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Upcoming shift
  if (status.status === 'upcoming' && status.nextShift) {
    const minutesUntil = getMinutesUntilShift(status.nextShift.start_time)
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">
                Shift in {formatTime(minutesUntil)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {status.nextShift.title || 'Shift'} starts at{' '}
              {formatShiftTime(status.nextShift.start_time)}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Can clock in
  if (status.status === 'can_clock_in') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-400">
            Shift Active
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('clock_in')}
          disabled={loading}
          className="h-7 gap-1.5 bg-green-600 hover:bg-green-700 border-green-500 text-white"
        >
          <Play className="h-3 w-3" />
          <span className="text-xs">Clock In</span>
        </Button>
      </div>
    )
  }

  // Working
  if (status.status === 'working') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
          <Timer className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">
            Working: {formatTime(elapsedTime)}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('clock_out')}
          disabled={loading}
          className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 border-red-500 text-white"
        >
          <Square className="h-3 w-3" />
          <span className="text-xs">Clock Out</span>
        </Button>
      </div>
    )
  }

  // Overtime
  if (status.status === 'overtime') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 animate-pulse">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-medium text-orange-400">
            OVERTIME: {formatTime(elapsedTime)}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('clock_out')}
          disabled={loading}
          className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 border-red-500 text-white"
        >
          <Square className="h-3 w-3" />
          <span className="text-xs">Clock Out</span>
        </Button>
      </div>
    )
  }

  return null
}
