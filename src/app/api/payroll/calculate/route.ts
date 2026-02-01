import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agencyId, startDate, endDate } = body

    if (!agencyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access to this agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.agency_id !== agencyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (profile.role !== 'grandmaster' && profile.role !== 'paladin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all active employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, username, role, base_salary, commission_rate, payment_method, avatar_url')
      .eq('agency_id', agencyId)
      .not('role', 'is', null)

    // Fetch models for the agency
    const { data: models } = await supabase
      .from('models')
      .select('id, name, total_revenue')
      .eq('agency_id', agencyId)

    // Fetch transactions for the period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('model_id, amount, created_at')
      .eq('agency_id', agencyId)
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate).toISOString())

    // Fetch model assignments
    const { data: assignments } = await supabase
      .from('model_assignments')
      .select('model_id, profile_id, commission_override')
      .eq('is_active', true)

    // Calculate revenue per model in the period
    const revenueByModel = new Map<string, number>()
    if (transactions) {
      for (const tx of transactions) {
        if (tx.model_id) {
          const current = revenueByModel.get(tx.model_id) || 0
          revenueByModel.set(tx.model_id, current + (tx.amount || 0))
        }
      }
    }

    // Build assignment map
    const employeeModels = new Map<string, { modelId: string; commission?: number }[]>()
    if (assignments) {
      for (const assignment of assignments) {
        const current = employeeModels.get(assignment.profile_id) || []
        current.push({
          modelId: assignment.model_id,
          commission: assignment.commission_override,
        })
        employeeModels.set(assignment.profile_id, current)
      }
    }

    // Calculate total agency revenue
    let agencyRevenue = 0
    for (const [, revenue] of revenueByModel) {
      agencyRevenue += revenue
    }

    // If no period transactions, use model total revenue as fallback
    if (agencyRevenue === 0 && models) {
      agencyRevenue = models.reduce((sum, m) => sum + (m.total_revenue || 0), 0)
    }

    // Generate payroll line items
    const lineItems = (employees || []).map(employee => {
      const baseSalary = employee.base_salary || 0
      const commissionRate = employee.commission_rate || 0

      // Get assigned models
      const assignedModels = employeeModels.get(employee.id) || []
      
      // Calculate revenue generated
      let revenueGenerated = 0
      const modelsCovered: string[] = []
      
      for (const assignment of assignedModels) {
        const modelRevenue = revenueByModel.get(assignment.modelId) || 0
        revenueGenerated += modelRevenue
        
        const model = models?.find(m => m.id === assignment.modelId)
        if (model) {
          modelsCovered.push(model.name)
        }
      }

      // Managers get commission on all revenue if no specific assignments
      if (assignedModels.length === 0 && (employee.role === 'grandmaster' || employee.role === 'paladin')) {
        revenueGenerated = agencyRevenue
        modelsCovered.push('All Models')
      }

      const commissionAmount = revenueGenerated * commissionRate
      const total = baseSalary + commissionAmount

      return {
        employee,
        baseSalary,
        revenueGenerated,
        commissionRate,
        commissionAmount,
        total,
        modelsCovered,
      }
    })

    return NextResponse.json({
      periodStart: startDate,
      periodEnd: endDate,
      lineItems,
      agencyRevenue,
      totalBase: lineItems.reduce((sum, i) => sum + i.baseSalary, 0),
      totalCommission: lineItems.reduce((sum, i) => sum + i.commissionAmount, 0),
      grandTotal: lineItems.reduce((sum, i) => sum + i.total, 0),
    })
  } catch (error) {
    console.error('Payroll calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    )
  }
}
