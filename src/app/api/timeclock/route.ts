import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * GET /api/timeclock
 * Get current timesheet status for user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const adminClient = await createAdminClient()
    const now = new Date()
    
    // Get current active timesheet (clocked in but not clocked out)
    const { data: activeTimesheet } = await adminClient
      .from('timesheets')
      .select('*')
      .eq('employee_id', user.id)
      .eq('status', 'active')
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()

    // Get today's and upcoming shifts
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    // Get current/next shift
    const { data: shifts } = await adminClient
      .from('shifts')
      .select('*')
      .eq('employee_id', user.id)
      .in('status', ['scheduled', 'in_progress'])
      .gte('end_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(3)

    const currentShift = shifts?.find(s => {
      const start = new Date(s.start_time)
      const end = new Date(s.end_time)
      return now >= start && now <= end
    })

    const nextShift = shifts?.find(s => new Date(s.start_time) > now)

    // Calculate status
    let status: 'no_shift' | 'upcoming' | 'can_clock_in' | 'working' | 'overtime' = 'no_shift'
    let shiftInfo = null
    let elapsedMinutes = 0

    if (activeTimesheet) {
      const clockInTime = new Date(activeTimesheet.clock_in)
      elapsedMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / 60000)
      
      if (currentShift) {
        const shiftEnd = new Date(currentShift.end_time)
        if (now > shiftEnd) {
          status = 'overtime'
        } else {
          status = 'working'
        }
        shiftInfo = currentShift
      } else {
        status = 'working' // Working outside scheduled shift
      }
    } else if (currentShift) {
      status = 'can_clock_in'
      shiftInfo = currentShift
    } else if (nextShift) {
      const startTime = new Date(nextShift.start_time)
      const minutesUntilShift = Math.floor((startTime.getTime() - now.getTime()) / 60000)
      
      // Can clock in 15 minutes before shift
      if (minutesUntilShift <= 15) {
        status = 'can_clock_in'
      } else {
        status = 'upcoming'
      }
      shiftInfo = nextShift
    }

    return NextResponse.json({
      status,
      activeTimesheet,
      currentShift: shiftInfo,
      nextShift: status === 'upcoming' ? nextShift : null,
      elapsedMinutes,
      role: profile.role,
    })
  } catch (error) {
    console.error('[TimeClock API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch time clock status' }, { status: 500 })
  }
}

/**
 * POST /api/timeclock
 * Clock in or clock out
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    // Owners don't need to clock in
    if (profile.role === 'owner') {
      return NextResponse.json({ error: 'Owners are exempt from time tracking' }, { status: 400 })
    }

    const body = await request.json()
    const action = body.action as 'clock_in' | 'clock_out'
    
    // Get IP from headers
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown'

    const adminClient = await createAdminClient()
    const now = new Date()

    if (action === 'clock_in') {
      // Check if already clocked in
      const { data: existing } = await adminClient
        .from('timesheets')
        .select('id')
        .eq('employee_id', user.id)
        .eq('status', 'active')
        .is('clock_out', null)
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
      }

      // Find current or upcoming shift
      const { data: shift } = await adminClient
        .from('shifts')
        .select('*')
        .eq('employee_id', user.id)
        .in('status', ['scheduled', 'in_progress'])
        .gte('end_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .single()

      // Calculate if late
      let isLate = false
      let lateMinutes = 0
      
      if (shift) {
        const shiftStart = new Date(shift.start_time)
        if (now > shiftStart) {
          isLate = true
          lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
        }
        
        // Update shift status to in_progress
        await adminClient
          .from('shifts')
          .update({ status: 'in_progress' })
          .eq('id', shift.id)
      }

      // Create timesheet
      const { data: timesheet, error } = await adminClient
        .from('timesheets')
        .insert({
          agency_id: profile.agency_id,
          employee_id: user.id,
          shift_id: shift?.id || null,
          clock_in: now.toISOString(),
          clock_in_ip: ip,
          is_late: isLate,
          late_minutes: lateMinutes,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        console.error('[TimeClock API] Clock in error:', error)
        return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'clock_in',
        timesheet,
        isLate,
        lateMinutes,
      })
    } else if (action === 'clock_out') {
      // Find active timesheet
      const { data: timesheet, error: findError } = await adminClient
        .from('timesheets')
        .select('*')
        .eq('employee_id', user.id)
        .eq('status', 'active')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single()

      if (findError || !timesheet) {
        return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 })
      }

      const clockIn = new Date(timesheet.clock_in)
      const totalMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000)

      // Check for early leave
      let isEarlyLeave = false
      let earlyLeaveMinutes = 0

      if (timesheet.shift_id) {
        const { data: shift } = await adminClient
          .from('shifts')
          .select('end_time')
          .eq('id', timesheet.shift_id)
          .single()

        if (shift) {
          const shiftEnd = new Date(shift.end_time)
          if (now < shiftEnd) {
            isEarlyLeave = true
            earlyLeaveMinutes = Math.floor((shiftEnd.getTime() - now.getTime()) / 60000)
          }
          
          // Update shift status
          await adminClient
            .from('shifts')
            .update({ status: 'completed' })
            .eq('id', timesheet.shift_id)
        }
      }

      // Update timesheet
      const { data: updatedTimesheet, error: updateError } = await adminClient
        .from('timesheets')
        .update({
          clock_out: now.toISOString(),
          clock_out_ip: ip,
          total_minutes: totalMinutes,
          is_early_leave: isEarlyLeave,
          early_leave_minutes: earlyLeaveMinutes,
          status: 'completed',
          updated_at: now.toISOString(),
        })
        .eq('id', timesheet.id)
        .select()
        .single()

      if (updateError) {
        console.error('[TimeClock API] Clock out error:', updateError)
        return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'clock_out',
        timesheet: updatedTimesheet,
        totalMinutes,
        isEarlyLeave,
        earlyLeaveMinutes,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[TimeClock API] Error:', error)
    return NextResponse.json({ error: 'Failed to process time clock' }, { status: 500 })
  }
}
