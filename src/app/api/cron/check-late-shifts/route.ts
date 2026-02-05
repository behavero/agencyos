import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS?.split(',') || []

/**
 * POST /api/cron/check-late-shifts
 * Check for employees who are late for their shifts and alert owner
 * Should run every 15 minutes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    if (!CRON_SECRET || (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET)) {
      console.log('[Cron Late Shifts] Unauthorized attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminClient()
    const now = new Date()

    // Find shifts that:
    // 1. Status is 'scheduled' (not yet in_progress)
    // 2. Start time was > 10 minutes ago
    // 3. No active timesheet for this shift
    const lateThreshold = new Date(now.getTime() - 10 * 60 * 1000) // 10 mins ago

    const { data: lateShifts, error: shiftsError } = await adminClient
      .from('shifts')
      .select(
        `
        id,
        employee_id,
        start_time,
        title,
        employee:profiles(username, agency_id),
        agency:agencies(name)
      `
      )
      .eq('status', 'scheduled')
      .lt('start_time', lateThreshold.toISOString())
      .gt('start_time', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Within last 2 hours

    if (shiftsError) {
      console.error('[Cron Late Shifts] Error fetching shifts:', shiftsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!lateShifts || lateShifts.length === 0) {
      console.log('[Cron Late Shifts] No late shifts found')
      return NextResponse.json({ success: true, alerts: 0 })
    }

    // Check each late shift for existing timesheet
    const alerts: string[] = []

    for (const shift of lateShifts) {
      // Check if employee has clocked in
      const { data: timesheet } = await adminClient
        .from('timesheets')
        .select('id')
        .eq('shift_id', shift.id)
        .single()

      if (timesheet) {
        // Employee clocked in (maybe late, but they're here)
        continue
      }

      // Calculate how late
      const shiftStart = new Date(shift.start_time)
      const minutesLate = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)

      const employee = Array.isArray(shift.employee) ? shift.employee[0] : shift.employee
      const employeeName = (employee as { username: string | null })?.username || 'Unknown'
      const shiftTitle = shift.title || 'Shift'

      alerts.push(
        `⚠️ **LATE ALERT**\n` +
          `Employee: ${employeeName}\n` +
          `Shift: ${shiftTitle}\n` +
          `Was due: ${minutesLate} minutes ago\n` +
          `Status: No clock-in detected`
      )

      // Update shift notes to mark as alerted
      await adminClient
        .from('shifts')
        .update({ notes: `Late alert sent at ${now.toISOString()}` })
        .eq('id', shift.id)
    }

    // Send Telegram alerts
    if (alerts.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_ALLOWED_USERS.length > 0) {
      for (const userId of TELEGRAM_ALLOWED_USERS) {
        if (!userId) continue

        const message = alerts.join('\n\n---\n\n')

        try {
          const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: userId,
                text: `🕐 **Late Shift Alert**\n\n${message}`,
                parse_mode: 'Markdown',
              }),
            }
          )

          if (!response.ok) {
            console.error(
              '[Cron Late Shifts] Failed to send Telegram alert:',
              await response.text()
            )
          }
        } catch (telegramError) {
          console.error('[Cron Late Shifts] Telegram error:', telegramError)
        }
      }
    }

    console.log(`[Cron Late Shifts] Sent ${alerts.length} alerts`)
    return NextResponse.json({
      success: true,
      alerts: alerts.length,
      details: alerts,
    })
  } catch (error) {
    console.error('[Cron Late Shifts] Error:', error)
    return NextResponse.json({ error: 'Failed to check late shifts' }, { status: 500 })
  }
}

// Also support GET for manual testing (with cron secret in query)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create a mock request with the secret in header
  const mockRequest = new NextRequest(request.url, {
    headers: new Headers({ authorization: `Bearer ${CRON_SECRET}` }),
  })

  return POST(mockRequest)
}
