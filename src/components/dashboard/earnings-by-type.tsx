'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface EarningsByTypeProps {
  data: {
    category: string
    amount: number
    color: string
  }[]
}

export function EarningsByType({ data }: EarningsByTypeProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Earnings by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="amount"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col items-center justify-center -mt-32 mb-20 pointer-events-none">
          <div className="text-3xl font-bold text-white">${total.toFixed(0)}</div>
          <div className="text-sm text-zinc-400">Total</div>
        </div>

        <div className="space-y-3 mt-4">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0.0'
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-zinc-300">{item.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">${item.amount.toFixed(2)}</span>
                  <span className="text-xs text-zinc-500 w-12 text-right">{percentage}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
