'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'thisYear'
  | 'custom'

export interface DateRangeValue {
  preset: DateRangePreset
  startDate?: Date
  endDate?: Date
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  className?: string
}

const PRESET_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
] as const

function getDateRangeFromPreset(preset: DateRangePreset): { startDate?: Date; endDate?: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: now }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { startDate: yesterday, endDate: today }
    }

    case 'last7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return { startDate: sevenDaysAgo, endDate: now }
    }

    case 'last30days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return { startDate: thirtyDaysAgo, endDate: now }
    }

    case 'thisMonth': {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: firstDayOfMonth, endDate: now }
    }

    case 'thisYear': {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      return { startDate: firstDayOfYear, endDate: now }
    }

    case 'all':
    default:
      return { startDate: undefined, endDate: undefined }
  }
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(value.startDate)
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(value.endDate)

  const handlePresetChange = (newPreset: DateRangePreset) => {
    if (newPreset === 'custom') {
      // Open calendar for custom selection
      setIsCalendarOpen(true)
      onChange({ preset: newPreset, startDate: tempStartDate, endDate: tempEndDate })
    } else {
      // Apply preset
      const dates = getDateRangeFromPreset(newPreset)
      setTempStartDate(dates.startDate)
      setTempEndDate(dates.endDate)
      onChange({ preset: newPreset, ...dates })
    }
  }

  const handleApplyCustomRange = () => {
    onChange({
      preset: 'custom',
      startDate: tempStartDate,
      endDate: tempEndDate,
    })
    setIsCalendarOpen(false)
  }

  const formatDateRange = () => {
    if (value.preset === 'all') return 'All Time'
    if (value.preset === 'custom' && value.startDate && value.endDate) {
      const start = value.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const end = value.endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `${start} - ${end}`
    }
    return PRESET_OPTIONS.find(opt => opt.value === value.preset)?.label || 'Select Range'
  }

  const formatDate = (date?: Date) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const parseDate = (dateString: string) => {
    if (!dateString) return undefined
    return new Date(dateString + 'T00:00:00')
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{formatDateRange()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {value.startDate && value.endDate
                ? `${value.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${value.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Pick dates'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formatDate(tempStartDate)}
                  onChange={e => setTempStartDate(parseDate(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formatDate(tempEndDate)}
                  onChange={e => setTempEndDate(parseDate(e.target.value))}
                  min={formatDate(tempStartDate)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCalendarOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApplyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
