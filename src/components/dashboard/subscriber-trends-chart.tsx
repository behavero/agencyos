'use client'

/**
 * Subscriber Trends Chart Component
 * Visualizes subscriber growth/churn over time
 * Part of Phase A: Complete the Core Loop
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Users } from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrendData {
  date: string
  total_subscribers: number
  new_subscribers: number
  cancelled_subscribers: number
  net_change: number
}

interface SubscriberTrendsChartProps {
  days?: number
}

export function SubscriberTrendsChart({ days = 30 }: SubscriberTrendsChartProps) {
  const [data, setData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrends()
  }, [days])

  async function fetchTrends() {
    try {
      setLoading(true)
      const response = await fetch(`/api/agency/subscriber-trends?days=${days}`)

      if (!response.ok) {
        throw new Error('Failed to fetch subscriber trends')
      }

      const result = await response.json()
      setData(result.trend || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscriber Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscriber Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Failed to load trends: {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscriber Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No trend data available yet. Run a sync to populate this chart.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate summary stats
  const latest = data[0]
  const oldest = data[data.length - 1]
  const totalGrowth = latest.total_subscribers - oldest.total_subscribers
  const totalNew = data.reduce((sum, d) => sum + (d.new_subscribers || 0), 0)
  const totalChurned = data.reduce((sum, d) => sum + (d.cancelled_subscribers || 0), 0)
  const growthRate =
    oldest.total_subscribers > 0 ? ((totalGrowth / oldest.total_subscribers) * 100).toFixed(1) : '0'

  // Format data for chart (reverse to show oldest first)
  const chartData = [...data].reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Total: Number(d.total_subscribers) || 0,
    New: Number(d.new_subscribers) || 0,
    Churned: Number(d.cancelled_subscribers) || 0,
    'Net Change': Number(d.net_change) || 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscriber Trends
          </span>
          <div className="flex items-center gap-4 text-sm font-normal">
            <div className="flex items-center gap-1">
              {totalGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {totalGrowth >= 0 ? '+' : ''}
                {totalGrowth} ({growthRate}%)
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{latest.total_subscribers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Current Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalNew.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">New Subscribers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalChurned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Churned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalGrowth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Net Growth</p>
          </div>
        </div>

        {/* Main Trend Line Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Total"
              stroke="#8b5cf6"
              fill="url(#colorTotal)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Growth/Churn Breakdown */}
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="New" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Churned" stroke="#ef4444" strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="Net Change"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
