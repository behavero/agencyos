import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import ContentIntelClient from './content-client'

export default async function ContentIntelPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch content analysis
  const { data: contentAnalysis } = await supabase
    .from('content_analysis')
    .select('*')
    .order('performance_score', { ascending: false })
    .limit(20)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-6">
          <ContentIntelClient contentData={contentAnalysis || []} />
        </main>
      </div>
    </div>
  )
}
