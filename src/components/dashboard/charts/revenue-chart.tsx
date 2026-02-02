'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import type { ChartDataPoint } from '@/lib/services/analytics-engine'

const CHART_THEME = {
  stroke: '#71717a',
  tick: { fill: '#e4e4e7', fontSize: 12 },
}

const CATEGORY_COLORS: Record<string, string> = {
  Subscription: '#a3e635', // Lime
  Tip: '#22d3ee', // Cyan
  Message: '#a855f7', // Purple
  Post: '#f59e0b', // Amber
}

interface RevenueChartProps {
  data: ChartDataPoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartConfig = {
    subscriptions: { label: 'Subscriptions', color: CATEGORY_COLORS.Subscription },
    tips: { label: 'Tips', color: CATEGORY_COLORS.Tip },
    messages: { label: 'Messages', color: CATEGORY_COLORS.Message },
    posts: { label: 'Posts', color: CATEGORY_COLORS.Post },
  } satisfies ChartConfig

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No revenue data available yet.</p>
          <p className="text-sm mt-2">Sync your Fanvue transactions to see charts.</p>
        </div>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
          stroke={CHART_THEME.stroke}
          tick={CHART_THEME.tick}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar dataKey="subscriptions" stackId="a" fill={CATEGORY_COLORS.Subscription} />
        <Bar dataKey="tips" stackId="a" fill={CATEGORY_COLORS.Tip} />
        <Bar dataKey="messages" stackId="a" fill={CATEGORY_COLORS.Message} />
        <Bar dataKey="posts" stackId="a" fill={CATEGORY_COLORS.Post} />
      </BarChart>
    </ChartContainer>
  )
}
