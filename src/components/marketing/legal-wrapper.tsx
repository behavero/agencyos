import Link from 'next/link'
import { Leaf } from 'lucide-react'

export function LegalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3 w-fit group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-white">OnyxOS</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              © 2026 Behave SRL. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link 
                href="/privacy" 
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Terms
              </Link>
              <Link 
                href="/data-deletion" 
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Data Deletion
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
