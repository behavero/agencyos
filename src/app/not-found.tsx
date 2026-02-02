import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Home, ArrowLeft } from 'lucide-react'

/**
 * Custom 404 Page
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-6xl font-bold text-foreground mb-2">
                404
              </h1>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Sector Uncharted
              </h2>
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist in the Onyx database.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Link>
              </Button>
            </div>

            {/* Nav hints */}
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-muted-foreground mb-2">Quick Links:</p>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                <Link href="/dashboard" className="text-primary hover:underline">
                  Dashboard
                </Link>
                <span className="text-zinc-700">•</span>
                <Link href="/dashboard/content/bio" className="text-primary hover:underline">
                  Onyx Link
                </Link>
                <span className="text-zinc-700">•</span>
                <Link href="/dashboard/team" className="text-primary hover:underline">
                  Team
                </Link>
                <span className="text-zinc-700">•</span>
                <Link href="/dashboard/analytics" className="text-primary hover:underline">
                  Analytics
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
