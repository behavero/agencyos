import { Suspense } from 'react'
import JoinContent from './join-content'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Join Page - Server Component with Suspense Boundary
 * Wraps the client component to handle useSearchParams() properly for static generation
 */
export default function JoinPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Suspense fallback={<JoinSkeleton />}>
        <JoinContent />
      </Suspense>
    </div>
  )
}

/**
 * Loading skeleton shown while JoinContent suspends
 */
function JoinSkeleton() {
  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
      <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-zinc-400">Loading...</p>
      </CardContent>
    </Card>
  )
}
