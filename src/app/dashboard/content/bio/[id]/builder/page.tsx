import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BuilderClient } from './builder-client'

interface BuilderPageProps {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/onboarding')
  }

  const adminClient = await createAdminClient()

  // Get the page with blocks
  const { data: page, error } = await adminClient
    .from('bio_pages')
    .select(`
      *,
      model:models(id, name, avatar_url),
      blocks:bio_blocks(*)
    `)
    .eq('id', id)
    .eq('agency_id', profile.agency_id)
    .single()

  if (error || !page) {
    notFound()
  }

  // Sort blocks by order_index
  const blocks = (page.blocks || []).sort(
    (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
  )

  return (
    <BuilderClient
      page={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        status: page.status,
        theme: page.theme as Record<string, string>,
        pixels: page.pixels as Record<string, string>,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        seo_image: page.seo_image,
        total_visits: page.total_visits,
        total_clicks: page.total_clicks,
        model: page.model as { id: string; name: string; avatar_url?: string } | null,
      }}
      initialBlocks={blocks}
    />
  )
}
