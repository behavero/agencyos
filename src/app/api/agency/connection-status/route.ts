/**
 * Agency Connection Status API
 * Returns the current Fanvue connection status for the user's agency.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyConnectionStatus } from '@/lib/services/agency-fanvue-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ connected: false, status: null })
    }

    const status = await getAgencyConnectionStatus(profile.agency_id)
    return NextResponse.json(status || { connected: false, status: null })
  } catch (error) {
    console.error('[Connection Status API] Error:', error)
    return NextResponse.json({ connected: false, status: null })
  }
}
