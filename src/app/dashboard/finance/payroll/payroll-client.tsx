'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Calendar, Download, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StaffMember {
  id: string
  username: string
  role: string
  payout_settings: Array<{
    id: string
    pay_model: 'hourly' | 'commission' | 'hybrid'
    hourly_rate: number
    commission_percent: number
    currency: string
    payment_method?: string
  }>
}

interface Paycheck {
  profile_id: string
  profile_name: string
  role: string
  pay_model: string
  hours_worked: number
  hourly_rate: number
  hourly_pay: number
  sales_generated: number
  commission_percent: number
  commission_pay: number
  total_payout: number
  currency: string
}

interface PayoutRun {
  id: string
  period_start: string
  period_end: string
  total_payout: number
  status: 'draft' | 'finalized' | 'paid'
  created_at: string
  details: { payouts: Paycheck[] }
}

export default function PayrollClient({ userId, agencyId }: { userId: string; agencyId: string }) {
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [paychecks, setPaychecks] = useState<Paycheck[]>([])
  const [runs, setRuns] = useState<PayoutRun[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchStaff()
    fetchRuns()
    
    // Set default dates (last month)
    const now = new Date()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    setStartDate(firstDayLastMonth.toISOString().split('T')[0])
    setEndDate(lastDayLastMonth.toISOString().split('T')[0])
  }, [])

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/payroll/settings')
      const data = await response.json()
      setStaff(data.staff || [])
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/payroll/runs')
      const data = await response.json()
      setRuns(data.runs || [])
    } catch (error) {
      console.error('Failed to fetch runs:', error)
    }
  }

  const updateStaffSettings = async (profileId: string, settings: Partial<any>) => {
    try {
      const response = await fetch('/api/payroll/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, ...settings }),
      })
      
      if (!response.ok) throw new Error()
      
      toast({ title: 'Settings updated successfully' })
      fetchStaff()
    } catch (error) {
      toast({ title: 'Failed to update settings', variant: 'destructive' })
    }
  }

  const calculatePreview = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Please select a date range', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      })
      
      const data = await response.json()
      setPaychecks(data.paychecks || [])
      
      toast({ title: `Preview generated for ${data.paychecks.length} staff members` })
    } catch (error) {
      toast({ title: 'Failed to calculate payroll', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const generatePayoutRun = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Please select a date range', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      })
      
      const data = await response.json()
      
      toast({ title: 'Payout run created successfully!' })
      fetchRuns()
      setPaychecks([])
    } catch (error) {
      toast({ title: 'Failed to create payout run', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'finalized':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'draft':
        return <XCircle className="w-4 h-4 text-zinc-500" />
      default:
        return null
    }
  }

  return (
    <Tabs defaultValue="configure" className="space-y-6">
      <TabsList className="bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="configure">Configuration</TabsTrigger>
        <TabsTrigger value="run">Run Payroll</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      {/* Configuration Tab */}
      <TabsContent value="configure">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Staff Pay Settings</CardTitle>
            <CardDescription>Configure hourly rates and commission percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400">Staff Member</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Pay Model</TableHead>
                  <TableHead className="text-zinc-400">Hourly Rate</TableHead>
                  <TableHead className="text-zinc-400">Commission %</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => {
                  const settings = member.payout_settings?.[0]
                  return (
                    <TableRow key={member.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-white font-medium">{member.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={settings?.pay_model || 'hourly'}
                          onValueChange={(value) =>
                            updateStaffSettings(member.id, { pay_model: value })
                          }
                        >
                          <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="commission">Commission</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={settings?.hourly_rate || 0}
                          className="w-24 bg-zinc-800 border-zinc-700"
                          onBlur={(e) =>
                            updateStaffSettings(member.id, {
                              hourly_rate: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          defaultValue={((settings?.commission_percent || 0) * 100).toFixed(2)}
                          className="w-24 bg-zinc-800 border-zinc-700"
                          onBlur={(e) =>
                            updateStaffSettings(member.id, {
                              commission_percent: (parseFloat(e.target.value) || 0) / 100,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Edit Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Run Payroll Tab */}
      <TabsContent value="run">
        <div className="space-y-6">
          {/* Date Range Picker */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select Pay Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <Button onClick={calculatePreview} disabled={loading}>
                Generate Preview
              </Button>
            </CardContent>
          </Card>

          {/* Preview Results */}
          {paychecks.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Payroll Preview</CardTitle>
                <CardDescription>
                  Review before generating statements. Period: {startDate} to {endDate}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableHead className="text-zinc-400">Staff Member</TableHead>
                      <TableHead className="text-zinc-400">Hours</TableHead>
                      <TableHead className="text-zinc-400">Hourly Pay</TableHead>
                      <TableHead className="text-zinc-400">Sales</TableHead>
                      <TableHead className="text-zinc-400">Commission</TableHead>
                      <TableHead className="text-zinc-400 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paychecks.map((paycheck) => (
                      <TableRow key={paycheck.profile_id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-white font-medium">
                          {paycheck.profile_name}
                          <span className="text-xs text-zinc-500 ml-2 capitalize">
                            ({paycheck.pay_model})
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {paycheck.hours_worked.toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          ${paycheck.hourly_pay.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          ${paycheck.sales_generated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          ${paycheck.commission_pay.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-white font-bold">
                          ${paycheck.total_payout.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-zinc-800 bg-zinc-800/50">
                      <TableCell colSpan={5} className="text-white font-bold">
                        TOTAL PAYOUT
                      </TableCell>
                      <TableCell className="text-right text-primary font-bold text-lg">
                        ${paychecks.reduce((sum, p) => sum + p.total_payout, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 flex gap-4">
                  <Button onClick={generatePayoutRun} disabled={loading} className="bg-primary hover:bg-primary/90 text-black">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Generate Statements (PDF)
                  </Button>
                  <Button variant="outline" onClick={() => setPaychecks([])}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Payout History</CardTitle>
            <CardDescription>Past payroll runs and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400">Period</TableHead>
                  <TableHead className="text-zinc-400">Total Payout</TableHead>
                  <TableHead className="text-zinc-400">Staff Count</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-white">
                      {new Date(run.period_start).toLocaleDateString()} -{' '}
                      {new Date(run.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-white font-bold">
                      ${run.total_payout.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {run.details?.payouts?.length || 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={run.status === 'paid' ? 'default' : 'outline'}
                        className="capitalize"
                      >
                        {getStatusIcon(run.status)}
                        <span className="ml-1">{run.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(run.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Download all PDFs for this run
                          run.details?.payouts?.forEach((paycheck: any) => {
                            const url = `/api/payroll/pdf/${run.id}?profile_id=${paycheck.profile_id}`
                            window.open(url, '_blank')
                          })
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
