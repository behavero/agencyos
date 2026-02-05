import { useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Database } from '@/types/database.types'

type Model = Database['public']['Tables']['models']['Row']

interface ModelSelectorTabsProps {
  models: Model[]
  selectedModelId: string | null
  onSelect: (modelId: string) => void
}

export function ModelSelectorTabs({
  models,
  selectedModelId,
  onSelect,
}: ModelSelectorTabsProps) {
  const visibleModels = useMemo(() => {
    const hasActive = models.some(model => model.status === 'active')
    if (hasActive) {
      return models.filter(model => model.status === 'active')
    }
    return models
  }, [models])

  if (visibleModels.length === 0) {
    return null
  }

  const activeId = selectedModelId || visibleModels[0]?.id

  return (
    <Tabs value={activeId} onValueChange={onSelect}>
      <TabsList className="bg-zinc-900/60 border border-zinc-800">
        {visibleModels.map(model => (
          <TabsTrigger
            key={model.id}
            value={model.id}
            className="gap-2 data-[state=active]:bg-zinc-950"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={model.avatar_url || undefined} />
              <AvatarFallback className="bg-zinc-700 text-[10px]">
                {model.name?.[0] || 'M'}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[120px] truncate">{model.name || 'Unnamed'}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
