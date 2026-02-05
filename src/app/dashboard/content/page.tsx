import { createClient } from '@/lib/supabase/server'
import ContentIntelClient from './content-client'

export default async function ContentIntelPage() {
  const supabase = await createClient()

  // Fetch user profile
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Fetch content analysis
  const { data: contentAnalysis } = await supabase
    .from('content_analysis')
    .select('*')
    .order('performance_score', { ascending: false })
    .limit(20)

  return <ContentIntelClient contentData={contentAnalysis || []} />
}
