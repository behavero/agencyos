import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch social stats for a model or all agency models
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const modelId = searchParams.get('modelId')
  const platform = searchParams.get('platform')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

  // Get user's agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 })
  }

  // Build query
  let query = supabase
    .from('social_stats')
    .select(`
      *,
      models!inner(name, agency_id)
    `)
    .eq('models.agency_id', profile.agency_id)
    .order('date', { ascending: false })

  if (modelId) {
    query = query.eq('model_id', modelId)
  }

  if (platform) {
    query = query.eq('platform', platform)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  query = query.lte('date', endDate)

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('Error fetching social stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST: Create or update social stats
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { model_id, platform, followers, views, likes, comments, shares, date } = body

  if (!model_id || !platform) {
    return NextResponse.json(
      { error: 'model_id and platform are required' },
      { status: 400 }
    )
  }

  // Validate platform
  const validPlatforms = ['instagram', 'tiktok', 'x', 'youtube']
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform. Must be one of: ' + validPlatforms.join(', ') },
      { status: 400 }
    )
  }

  const statDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('social_stats')
    .upsert({
      model_id,
      platform,
      date: statDate,
      followers: followers || 0,
      views: views || 0,
      likes: likes || 0,
      comments: comments || 0,
      shares: shares || 0,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'model_id,platform,date'
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving social stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, message: 'Stats saved successfully' })
}
