/**
 * Payroll Service - Hybrid Payroll Engine
 * Supports hourly, commission, and hybrid pay models
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface PayoutSettings {
  id: string
  profile_id: string
  currency: 'USD' | 'EUR' | 'GBP' | 'RON'
  pay_model: 'hourly' | 'commission' | 'hybrid'
  hourly_rate: number
  commission_percent: number
  payment_method?: string
  payment_details?: Record<string, any>
}

export interface PaycheckCalculation {
  profile_id: string
  profile_name: string
  role: string
  pay_model: 'hourly' | 'commission' | 'hybrid'
  
  // Hourly Breakdown
  hours_worked: number
  hourly_rate: number
  hourly_pay: number
  
  // Commission Breakdown
  sales_generated: number
  commission_percent: number
  commission_pay: number
  
  // Additional
  bonus: number
  deductions: number
  
  // Total
  total_payout: number
  currency: string
  
  // Payment Info
  payment_method?: string
  payment_details?: Record<string, any>
}

/**
 * Calculate a single paycheck for a profile
 */
export async function calculatePaycheck(
  profileId: string,
  startDate: string,
  endDate: string
): Promise<PaycheckCalculation | null> {
  try {
    const supabase = await createAdminClient()
    
    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, role, agency_id')
      .eq('id', profileId)
      .single()
    
    if (!profile) {
      throw new Error('Profile not found')
    }
    
    // Get payout settings
    const { data: settings } = await supabase
      .from('payout_settings')
      .select('*')
      .eq('profile_id', profileId)
      .single()
    
    if (!settings) {
      // No settings configured, return zero payout
      return {
        profile_id: profileId,
        profile_name: profile.username || 'Unknown',
        role: profile.role,
        pay_model: 'hourly',
        hours_worked: 0,
        hourly_rate: 0,
        hourly_pay: 0,
        sales_generated: 0,
        commission_percent: 0,
        commission_pay: 0,
        bonus: 0,
        deductions: 0,
        total_payout: 0,
        currency: 'USD',
      }
    }
    
    let hoursWorked = 0
    let hourlyPay = 0
    let salesGenerated = 0
    let commissionPay = 0
    
    // Calculate Hourly Pay (if applicable)
    if (settings.pay_model === 'hourly' || settings.pay_model === 'hybrid') {
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('clock_in, clock_out')
        .eq('employee_id', profileId)
        .gte('clock_in', startDate)
        .lte('clock_in', endDate)
        .not('clock_out', 'is', null)
      
      if (timesheets && timesheets.length > 0) {
        hoursWorked = timesheets.reduce((total, timesheet) => {
          const clockIn = new Date(timesheet.clock_in).getTime()
          const clockOut = new Date(timesheet.clock_out).getTime()
          const duration = (clockOut - clockIn) / (1000 * 60 * 60) // Convert ms to hours
          return total + duration
        }, 0)
        
        hourlyPay = hoursWorked * (settings.hourly_rate || 0)
      }
    }
    
    // Calculate Commission Pay (if applicable)
    if (settings.pay_model === 'commission' || settings.pay_model === 'hybrid') {
      // Check fan_insights for chatter sales
      const { data: fanInsights } = await supabase
        .from('fan_insights')
        .select('total_spent')
        .eq('chatter_id', profileId)
        .gte('last_message_at', startDate)
        .lte('last_message_at', endDate)
      
      if (fanInsights && fanInsights.length > 0) {
        salesGenerated = fanInsights.reduce((total, insight) => {
          return total + (insight.total_spent || 0)
        }, 0)
      }
      
      // Alternative: Check transactions if model is assigned
      const { data: modelAssignments } = await supabase
        .from('model_assignments')
        .select('model_id')
        .eq('chatter_id', profileId)
      
      if (modelAssignments && modelAssignments.length > 0) {
        const modelIds = modelAssignments.map(a => a.model_id)
        
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .in('model_id', modelIds)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
        
        if (transactions && transactions.length > 0) {
          const transactionTotal = transactions.reduce((total, t) => {
            return total + (t.amount || 0)
          }, 0)
          
          // Use the higher of fan_insights or transactions
          salesGenerated = Math.max(salesGenerated, transactionTotal)
        }
      }
      
      commissionPay = salesGenerated * (settings.commission_percent || 0)
    }
    
    const totalPayout = hourlyPay + commissionPay
    
    return {
      profile_id: profileId,
      profile_name: profile.username || 'Unknown',
      role: profile.role,
      pay_model: settings.pay_model,
      hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimals
      hourly_rate: settings.hourly_rate || 0,
      hourly_pay: Math.round(hourlyPay * 100) / 100,
      sales_generated: Math.round(salesGenerated * 100) / 100,
      commission_percent: settings.commission_percent || 0,
      commission_pay: Math.round(commissionPay * 100) / 100,
      bonus: 0,
      deductions: 0,
      total_payout: Math.round(totalPayout * 100) / 100,
      currency: settings.currency,
      payment_method: settings.payment_method,
      payment_details: settings.payment_details,
    }
  } catch (error) {
    console.error('calculatePaycheck error:', error)
    return null
  }
}

/**
 * Calculate paychecks for all staff in an agency
 */
export async function calculateAgencyPayroll(
  agencyId: string,
  startDate: string,
  endDate: string
): Promise<PaycheckCalculation[]> {
  try {
    const supabase = await createAdminClient()
    
    // Get all profiles in agency (exclude owners)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('agency_id', agencyId)
      .neq('role', 'owner')
    
    if (!profiles || profiles.length === 0) {
      return []
    }
    
    // Calculate paycheck for each profile
    const paychecks = await Promise.all(
      profiles.map(profile => calculatePaycheck(profile.id, startDate, endDate))
    )
    
    // Filter out nulls
    return paychecks.filter(Boolean) as PaycheckCalculation[]
  } catch (error) {
    console.error('calculateAgencyPayroll error:', error)
    return []
  }
}

/**
 * Create a payout run record
 */
export async function createPayoutRun(
  agencyId: string,
  startDate: string,
  endDate: string,
  paychecks: PaycheckCalculation[],
  createdBy: string
): Promise<string | null> {
  try {
    const supabase = await createAdminClient()
    
    const totalPayout = paychecks.reduce((sum, p) => sum + p.total_payout, 0)
    
    const { data, error } = await supabase
      .from('payout_runs')
      .insert({
        agency_id: agencyId,
        period_start: startDate,
        period_end: endDate,
        total_payout: totalPayout,
        currency: 'USD', // TODO: Support multi-currency
        status: 'draft',
        details: { payouts: paychecks },
        created_by: createdBy,
      })
      .select('id')
      .single()
    
    if (error) throw error
    
    // Create individual payout records
    await Promise.all(
      paychecks.map(paycheck =>
        supabase.from('individual_payouts').insert({
          payout_run_id: data.id,
          profile_id: paycheck.profile_id,
          agency_id: agencyId,
          hours_worked: paycheck.hours_worked,
          hourly_pay: paycheck.hourly_pay,
          sales_generated: paycheck.sales_generated,
          commission_pay: paycheck.commission_pay,
          bonus: paycheck.bonus,
          deductions: paycheck.deductions,
          total_payout: paycheck.total_payout,
          currency: paycheck.currency,
          payment_method: paycheck.payment_method,
          payment_details: paycheck.payment_details,
          status: 'pending',
        })
      )
    )
    
    return data.id
  } catch (error) {
    console.error('createPayoutRun error:', error)
    return null
  }
}

/**
 * Finalize a payout run (lock it)
 */
export async function finalizePayoutRun(runId: string): Promise<boolean> {
  try {
    const supabase = await createAdminClient()
    
    const { error } = await supabase
      .from('payout_runs')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', runId)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('finalizePayoutRun error:', error)
    return false
  }
}

/**
 * Mark a payout run as paid
 */
export async function markPayoutRunPaid(runId: string): Promise<boolean> {
  try {
    const supabase = await createAdminClient()
    
    const { error } = await supabase
      .from('payout_runs')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', runId)
    
    if (error) throw error
    
    // Update individual payouts
    await supabase
      .from('individual_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('payout_run_id', runId)
    
    return true
  } catch (error) {
    console.error('markPayoutRunPaid error:', error)
    return false
  }
}
