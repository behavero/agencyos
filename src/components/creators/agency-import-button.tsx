'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AgencyImportButton() {
  const router = useRouter()
  const [isImporting, setIsImporting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleImport = async () => {
    setIsImporting(true)
    setOpen(false) // Close dialog

    toast.loading('🏢 Discovering creators from agency account...', {
      id: 'agency-import',
    })

    try {
      const response = await fetch('/api/agency/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success) {
        toast.success('✅ Agency Import Complete!', {
          id: 'agency-import',
          description: `${result.imported} new, ${result.updated} updated (${result.total} total)`,
          duration: 5000,
        })

        // Show details in a separate toast
        if (result.creators?.length > 0) {
          setTimeout(() => {
            const creatorsList = result.creators
              .map((c: any) => `• ${c.displayName} (@${c.handle})`)
              .join('\n')

            toast.info('Imported Creators:', {
              description: creatorsList,
              duration: 10000,
            })
          }, 1000)
        }

        // Refresh the page
        router.refresh()
      } else {
        const errorMessage = result.error || 'Check console for details'

        // Check if it's the "no connection" error
        if (errorMessage.includes('NO_FANVUE_CONNECTION')) {
          toast.error('⚠️ No Fanvue Connection', {
            id: 'agency-import',
            description:
              'Please connect at least one creator via "Connect with Fanvue" first, then try importing.',
            duration: 8000,
          })
        } else {
          toast.error('Import Failed', {
            id: 'agency-import',
            description: errorMessage,
          })
        }

        if (result.errors?.length > 0) {
          console.error('Import errors:', result.errors)
        }
      }
    } catch (error) {
      console.error('Agency import error:', error)
      toast.error('Import Failed', {
        id: 'agency-import',
        description: 'Check your connection and try again',
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-violet-500/30 hover:border-violet-500/50"
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4" />
              Import from Agency
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-500" />
            Import Creators from Agency
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Auto-Discovery:</strong> Automatically imports all creators connected to
                your Fanvue agency account.
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>No Manual Entry:</strong> Profile info (name, username, avatar) is imported
                automatically.
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Safe:</strong> Existing creators will be updated, not duplicated.
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-amber-500 dark:text-amber-400 bg-amber-500/10 rounded-lg p-3 mt-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Prerequisites:</strong> At least one creator must be connected via "Connect
                with Fanvue" first. Their token will be used to access the agency's creator list.
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <div>
                💡 <strong>After importing:</strong> Each creator will need to individually connect
                via "Connect with Fanvue" to enable their own data syncing.
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Creators'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
