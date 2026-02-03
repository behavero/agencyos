'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, TrendingDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface NewFansAnalyticsProps {
  newFansCount: number
  variation: number
  chartData?: Array<{ date: string; count: number }>
  dateRangeLabel: string
  className?: string
}

const CHART_THEME = {
  stroke: '#71717a',
  tick: { fill: '#e4e4e7', fontSize: 12 },
}

export function NewFansAnalytics({
  newFansCount,
  variation,
  chartData = [],
  dateRangeLabel,
  className,
}: NewFansAnalyticsProps) {
  return (
    <Card className={`glass border-indigo-500/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              New Fans Analytics
            </CardTitle>
            <CardDescription>{dateRangeLabel}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">New fans</div>
            <div className="text-3xl font-bold text-indigo-400">
              {newFansCount.toLocaleString()}
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              {variation >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`text-xs ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {variation >= 0 ? '+' : ''}
                {variation.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">variation</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke={CHART_THEME.stroke}
                tick={CHART_THEME.tick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke={CHART_THEME.stroke}
                tick={CHART_THEME.tick}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#818cf8"
                strokeWidth={2}
                dot={{ fill: '#818cf8', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-center">
            <p className="text-muted-foreground">
              No subscriber growth data available yet.
              <br />
              <span className="text-sm">Sync your Fanvue data to see trends.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
