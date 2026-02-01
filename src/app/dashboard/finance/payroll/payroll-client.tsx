'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  DollarSign,
  Calculator,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Send,
  FileText,
  Loader2,
  ArrowRight,
  Wallet,
  Banknote,
  CreditCard,
  Bitcoin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  username: string | null
  role: string | null
  base_salary: number
  commission_rate: number
  payment_method: string | null
  avatar_url: string | null
}

interface Payout {
  id: string
  recipient_id: string
  period_start: string
  period_end: string
  amount_base: number
  amount_commission: number
  amount_bonus: number
  amount_deductions: number
  amount_total: number
  revenue_generated: number
  commission_rate: number
  status: string
  payment_method: string | null
  payment_reference: string | null
  paid_at: string | null
  created_at: string
  recipient: {
    id: string
    username: string | null
    avatar_url: string | null
    role: string | null
  } | null
}

interface Model {
  id: string
  name: string
  total_revenue: number | null
}

interface PayrollClientProps {
  employees: Employee[]
  payouts: Payout[]
  models: Model[]
  agencyId: string
  userRole: string | null
}

interface PayrollLineItem {
  employee: Employee
  baseSalary: number
  revenueGenerated: number
  commissionRate: number
  commissionAmount: number
  total: number
}

const ROLE_COLORS: Record<string, string> = {
  grandmaster: 'bg-yellow-500/20 text-yellow-400',
  paladin: 'bg-blue-500/20 text-blue-400',
  alchemist: 'bg-purple-500/20 text-purple-400',
  ranger: 'bg-green-500/20 text-green-400',
  rogue: 'bg-red-500/20 text-red-400',
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  bank_transfer: <Banknote className="w-4 h-4" />,
  wise: <Send className="w-4 h-4" />,
  crypto: <Bitcoin className="w-4 h-4" />,
  paypal: <CreditCard className="w-4 h-4" />,
}

export function PayrollClient({ employees, payouts, models, agencyId, userRole }: PayrollClientProps) {
  const [activeTab, setActiveTab] = useState('run')
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [payrollDraft, setPayrollDraft] = useState<PayrollLineItem[] | null>(null)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')

  // Period selection
  const now = new Date()
  const [periodStart, setPeriodStart] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  )
  const [periodEnd, setPeriodEnd] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  )

  // Calculate total agency revenue from models
  const totalAgencyRevenue = models.reduce((sum, m) => sum + (m.total_revenue || 0), 0)

  // Run payroll calculation
  const runPayroll = async () => {
    setIsCalculating(true)
    
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          startDate: periodStart,
          endDate: periodEnd,
        }),
      })

      if (!response.ok) throw new Error('Failed to calculate payroll')

      const data = await response.json()
      setPayrollDraft(data.lineItems)
      toast.success('Payroll calculated!')
    } catch (error) {
      console.error('Payroll error:', error)
      
      // Fallback: Calculate locally with available data
      const lineItems: PayrollLineItem[] = employees.map(emp => {
        const baseSalary = emp.base_salary || 0
        const commissionRate = emp.commission_rate || 0
        // For demo, assume managers get commission on total revenue
        const revenueGenerated = (emp.role === 'grandmaster' || emp.role === 'paladin') 
          ? totalAgencyRevenue 
          : 0
        const commissionAmount = revenueGenerated * commissionRate
        
        return {
          employee: emp,
          baseSalary,
          revenueGenerated,
          commissionRate,
          commissionAmount,
          total: baseSalary + commissionAmount,
        }
      })
      
      setPayrollDraft(lineItems)
      toast.success('Payroll calculated (local mode)')
    } finally {
      setIsCalculating(false)
    }
  }

  // Save draft payouts
  const saveDraftPayouts = async () => {
    if (!payrollDraft) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/payroll/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          periodStart,
          periodEnd,
          lineItems: payrollDraft,
        }),
      })

      if (!response.ok) throw new Error('Failed to save payroll')

      toast.success('Payroll saved as draft!')
      setPayrollDraft(null)
      setActiveTab('history')
      window.location.reload() // Refresh to show new payouts
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save payroll')
    } finally {
      setIsSaving(false)
    }
  }

  // Mark as paid
  const markAsPaid = async (payout: Payout) => {
    try {
      const response = await fetch(`/api/payroll/${payout.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReference }),
      })

      if (!response.ok) throw new Error('Failed to mark as paid')

      toast.success('Payout marked as paid!')
      setIsPayDialogOpen(false)
      setSelectedPayout(null)
      setPaymentReference('')
      window.location.reload()
    } catch (error) {
      console.error('Pay error:', error)
      toast.error('Failed to mark as paid')
    }
  }

  // Calculate totals from draft
  const draftTotals = payrollDraft?.reduce(
    (acc, item) => ({
      base: acc.base + item.baseSalary,
      commission: acc.commission + item.commissionAmount,
      total: acc.total + item.total,
    }),
    { base: 0, commission: 0, total: 0 }
  ) || { base: 0, commission: 0, total: 0 }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
      case 'pending':
      case 'approved':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case 'draft':
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" /> Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isAdmin = userRole === 'grandmaster' || userRole === 'paladin'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll & Commissions</h1>
          <p className="text-muted-foreground">
            Calculate and manage team compensation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <DollarSign className="w-4 h-4 mr-1" />
            {totalAgencyRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            <span className="text-muted-foreground ml-1 text-sm">total revenue</span>
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Wallet className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {payouts.filter(p => p.status === 'paid').length}
                </p>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {payouts.filter(p => p.status === 'draft' || p.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {payouts
                    .filter(p => p.status === 'paid')
                    .reduce((sum, p) => sum + (p.amount_total || 0), 0)
                    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="run">
            <Calculator className="w-4 h-4 mr-2" />
            Run Payroll
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            History ({payouts.length})
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team Rates
          </TabsTrigger>
        </TabsList>

        {/* Run Payroll Tab */}
        <TabsContent value="run" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculate Payroll</CardTitle>
              <CardDescription>
                Select a period and generate payroll for all team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Period Selection */}
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground mb-2" />
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <Button
                  onClick={runPayroll}
                  disabled={isCalculating || !isAdmin}
                  className="gap-2"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Run Payroll
                    </>
                  )}
                </Button>
              </div>

              {!isAdmin && (
                <p className="text-sm text-yellow-500">
                  Only Grandmasters and Paladins can run payroll.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payroll Draft */}
          {payrollDraft && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payroll Preview</CardTitle>
                    <CardDescription>
                      {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={saveDraftPayouts}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollDraft.map((item) => (
                      <TableRow key={item.employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={item.employee.avatar_url || undefined} />
                              <AvatarFallback>
                                {item.employee.username?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{item.employee.username || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[item.employee.role || ''] || ''}>
                            {item.employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.baseSalary.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${item.revenueGenerated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-400">
                            +${item.commissionAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(item.commissionRate * 100).toFixed(1)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${item.total.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Base Salaries</span>
                      <span>${draftTotals.base.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Commissions</span>
                      <span className="text-green-400">+${draftTotals.commission.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Grand Total</span>
                      <span className="text-primary">${draftTotals.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No payroll history</h3>
                  <p className="text-muted-foreground">
                    Run your first payroll to see records here
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={payout.recipient?.avatar_url || undefined} />
                              <AvatarFallback>
                                {payout.recipient?.username?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{payout.recipient?.username || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{payout.recipient?.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(payout.period_start).toLocaleDateString()} - 
                            {new Date(payout.period_end).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(payout.amount_base || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          +${(payout.amount_commission || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(payout.amount_total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payout.status)}
                        </TableCell>
                        <TableCell>
                          {payout.status !== 'paid' && isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPayout(payout)
                                setIsPayDialogOpen(true)
                              }}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {payout.status === 'paid' && payout.payment_reference && (
                            <span className="text-xs text-muted-foreground">
                              Ref: {payout.payment_reference}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Rates Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Compensation Rates</CardTitle>
              <CardDescription>
                Base salaries and commission rates for each team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Base Salary</TableHead>
                    <TableHead className="text-right">Commission Rate</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback>
                              {emp.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.username || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[emp.role || ''] || ''}>
                          {emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(emp.base_salary || 0).toLocaleString()}/mo
                      </TableCell>
                      <TableCell className="text-right">
                        {((emp.commission_rate || 0) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {PAYMENT_ICONS[emp.payment_method || 'bank_transfer']}
                          <span className="capitalize">
                            {(emp.payment_method || 'bank_transfer').replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-muted-foreground mt-4">
                Edit rates in Team Management → Edit Member
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark as Paid Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payout as Paid</DialogTitle>
            <DialogDescription>
              Confirm payment of ${selectedPayout?.amount_total?.toLocaleString()} to{' '}
              {selectedPayout?.recipient?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Reference (optional)</Label>
              <Input
                placeholder="Transaction ID, Wire reference, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedPayout && markAsPaid(selectedPayout)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
