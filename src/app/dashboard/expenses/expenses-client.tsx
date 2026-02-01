'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database.types'
import {
  Plus,
  Trash2,
  Pencil,
  DollarSign,
  Building2,
  User,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

type Expense = Database['public']['Tables']['expenses']['Row']

// Simplified model type for the dropdown
interface SimpleModel {
  id: string
  name: string
}

interface ExpensesClientProps {
  agencyId: string
  models: SimpleModel[]
}

const CATEGORIES = [
  { value: 'salaries', label: 'Salaries', icon: User },
  { value: 'software', label: 'Software', icon: CreditCard },
  { value: 'marketing', label: 'Marketing', icon: TrendingUp },
  { value: 'equipment', label: 'Equipment', icon: Building2 },
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'travel', label: 'Travel', icon: Calendar },
  { value: 'other', label: 'Other', icon: DollarSign },
] as const

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
] as const

export default function ExpensesClient({ agencyId, models }: ExpensesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  type CategoryType = 'salaries' | 'software' | 'marketing' | 'equipment' | 'office' | 'travel' | 'other'
  type FrequencyType = 'monthly' | 'yearly' | 'one-time'

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    amount: '',
    category: 'software' as CategoryType,
    frequency: 'monthly' as FrequencyType,
    model_id: '',
    is_recurring: true,
  })

  // Fetch expenses
  useEffect(() => {
    fetchExpenses()
  }, [agencyId])

  const fetchExpenses = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
    
    if (error) {
      toast.error('Failed to load expenses')
    } else {
      setExpenses(data || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      amount: '',
      category: 'software',
      frequency: 'monthly',
      model_id: '',
      is_recurring: true,
    })
    setEditingExpense(null)
  }

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setForm({
        name: expense.name || '',
        description: expense.description || '',
        amount: String(expense.amount) || '',
        category: (expense.category || 'software') as CategoryType,
        frequency: (expense.frequency || 'monthly') as FrequencyType,
        model_id: expense.model_id || '',
        is_recurring: expense.is_recurring ?? true,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!form.name || !form.amount) {
      toast.error('Name and amount are required')
      return
    }

    const expenseData = {
      agency_id: agencyId,
      name: form.name,
      description: form.description || null,
      amount: parseFloat(form.amount),
      category: form.category,
      frequency: form.frequency,
      model_id: form.model_id || null,
      is_recurring: form.is_recurring,
      status: 'active' as const,
    }

    if (editingExpense) {
      // Update
      const { error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', editingExpense.id)

      if (error) {
        toast.error('Failed to update expense')
      } else {
        toast.success('Expense updated')
        fetchExpenses()
      }
    } else {
      // Create
      const { error } = await supabase
        .from('expenses')
        .insert(expenseData)

      if (error) {
        toast.error('Failed to create expense')
      } else {
        toast.success('Expense created')
        fetchExpenses()
      }
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete expense')
    } else {
      toast.success('Expense deleted')
      fetchExpenses()
    }
  }

  // Calculate totals
  const activeExpenses = expenses.filter(e => e.status === 'active')
  const totalMonthly = activeExpenses
    .filter(e => e.frequency === 'monthly')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const totalYearly = activeExpenses
    .filter(e => e.frequency === 'yearly')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const totalOneTime = activeExpenses
    .filter(e => e.frequency === 'one-time')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
  const agencyExpenses = activeExpenses.filter(e => !e.model_id).length
  const modelExpenses = activeExpenses.filter(e => e.model_id).length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getCategoryBadge = (category: string | null) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat?.label || 'Other'
  }

  const getModelName = (modelId: string | null) => {
    if (!modelId) return 'Agency'
    const model = models.find(m => m.id === modelId)
    return model?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-zinc-400">Track your agency and model expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editingExpense ? 'Update expense details' : 'Add a new expense to track'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., ChatGPT Pro"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Amount ($)</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Frequency</Label>
                  <Select
                    value={form.frequency}
                    onValueChange={(v: 'monthly' | 'yearly' | 'one-time') => setForm({ ...form, frequency: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v: typeof form.category) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Assign To</Label>
                  <Select
                    value={form.model_id || 'agency'}
                    onValueChange={(v) => setForm({ ...form, model_id: v === 'agency' ? '' : v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="agency">Agency (Shared)</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Description (Optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional notes..."
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExpense}>
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalMonthly)}</div>
            <p className="text-xs text-zinc-500">/month recurring</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Yearly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalYearly)}</div>
            <p className="text-xs text-zinc-500">{formatCurrency(totalYearly / 12)}/mo prorated</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Agency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{agencyExpenses}</div>
            <p className="text-xs text-zinc-500">shared expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Model-specific</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{modelExpenses}</div>
            <p className="text-xs text-zinc-500">assigned expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">All Expenses</CardTitle>
          <CardDescription className="text-zinc-400">
            {expenses.length} total expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">No expenses yet</h3>
              <p className="text-zinc-400 mb-4">Start tracking your costs</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Category</TableHead>
                  <TableHead className="text-zinc-400">Assigned To</TableHead>
                  <TableHead className="text-zinc-400">Frequency</TableHead>
                  <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-zinc-500">
                      {expense.created_at
                        ? new Date(expense.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{expense.name}</p>
                        {expense.description && (
                          <p className="text-xs text-zinc-500">{expense.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0">
                        {getCategoryBadge(expense.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={expense.model_id 
                          ? 'border-purple-500/50 text-purple-400' 
                          : 'border-zinc-700 text-zinc-400'
                        }
                      >
                        {getModelName(expense.model_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 capitalize">
                      {expense.frequency}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-red-400">
                        -{formatCurrency(Number(expense.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
