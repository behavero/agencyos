import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shimmer loading skeleton for dashboard stat cards.
 * Shows a pulsing placeholder while data is being fetched.
 */
export function StatCardSkeleton() {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

/**
 * Shimmer loading skeleton for larger dashboard cards (charts, lists).
 */
export function ChartCardSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height} rounded-lg`} />
      </CardContent>
    </Card>
  )
}

/**
 * Shimmer loading skeleton for list cards (tracking links, top spenders, etc.)
 */
export function ListCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Grid of skeleton stat cards (for the top row of the dashboard).
 */
export function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
