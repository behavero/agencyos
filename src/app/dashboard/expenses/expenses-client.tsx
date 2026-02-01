'use client'

import { useState } from 'react'
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
  DollarSign,
  Plus,
  Calendar,
  Building2,
  Users,
  Repeat,
  Edit2,
  Trash2,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Expense = Database['public']['Tables']['expenses']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']

interface ExpensesClientProps {
  agencyId: string
  expenses: Expense[]
  models: Array<{ id: string; name: string }>
  agency: Agency | null
}

const categoryIcons: Record<string, any> = {
  salaries: Users,
  software: DollarSign,
  marketing: TrendingUp,
  equipment: Building2,
  office: Building2,
  travel: Calendar,
  other: DollarSign,
}

const categoryLabels: Record<string, string> = {
  salaries: 'Salaries',
  software: 'Software & Tools',
  marketing: 'Marketing',
  equipment: 'Equipment',
  office: 'Office',
  travel: 'Travel',
  other: 'Other',
}

export default function ExpensesClient({ agencyId, expenses: initialExpenses, models, agency }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly' as 'monthly' | 'yearly' | 'one-time',
    category: 'software' as Expense['category'],
    model_id: '',
    next_due_date: '',
  })

  const supabase = createClient()

  const resetForm = () => {
    setExpenseForm({
      name: '',
      description: '',
      amount: '',
      frequency: 'monthly',
      category: 'software',
      model_id: '',
      next_due_date: '',
    })
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          agency_id: agencyId,
          name: expenseForm.name,
          description: expenseForm.description || null,
          amount: parseFloat(expenseForm.amount),
          frequency: expenseForm.frequency,
          category: expenseForm.category,
          model_id: expenseForm.model_id || null,
          next_due_date: expenseForm.next_due_date || null,
          is_recurring: expenseForm.frequency !== 'one-time',
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      setExpenses([data, ...expenses])
      toast.success('Expense added successfully!')
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Add expense error:', error)
      toast.error(error.message || 'Failed to add expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          name: expenseForm.name,
          description: expenseForm.description || null,
          amount: parseFloat(expenseForm.amount),
          frequency: expenseForm.frequency,
          category: expenseForm.category,
          model_id: expenseForm.model_id || null,
          next_due_date: expenseForm.next_due_date || null,
          is_recurring: expenseForm.frequency !== 'one-time',
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingExpense.id)
        .select()
        .single()

      if (error) throw error

      setExpenses(expenses.map(exp => exp.id === editingExpense.id ? data : exp))
      toast.success('Expense updated!')
      setIsEditDialogOpen(false)
      setEditingExpense(null)
      resetForm()
    } catch (error: any) {
      console.error('Update expense error:', error)
      toast.error(error.message || 'Failed to update expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    setIsDeleting(id)

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      setExpenses(expenses.filter(exp => exp.id !== id))
      toast.success('Expense deleted')
    } catch (error: any) {
      console.error('Delete expense error:', error)
      toast.error(error.message || 'Failed to delete expense')
    } finally {
      setIsDeleting(null)
    }
  }

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseForm({
      name: expense.name,
      description: expense.description || '',
      amount: expense.amount.toString(),
      frequency: expense.frequency as 'monthly' | 'yearly' | 'one-time' || 'monthly',
      category: expense.category,
      model_id: expense.model_id || '',
      next_due_date: expense.next_due_date || '',
    })
    setIsEditDialogOpen(true)
  }

  // Calculate totals
  const activeExpenses = expenses.filter(e => e.status === 'active')
  const totalMonthly = activeExpenses
    .filter(e => e.is_recurring && e.frequency === 'monthly')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
  const totalYearly = activeExpenses
    .filter(e => e.is_recurring && e.frequency === 'yearly')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const agencyExpenses = activeExpenses
    .filter(e => !e.model_id)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const modelExpenses = activeExpenses
    .filter(e => e.model_id)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const ExpenseFormFields = () => (
    <>
      <div>
        <Label htmlFor="name">Expense Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Canva Pro Subscription"
          value={expenseForm.name}
          onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Optional notes..."
          value={expenseForm.description}
          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="amount">Amount ($) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={expenseForm.amount}
          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <select
            id="frequency"
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
            value={expenseForm.frequency}
            onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value as any })}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="one-time">One-time</option>
          </select>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
            value={expenseForm.category || 'other'}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="model_id">Assign To</Label>
        <select
          id="model_id"
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
          value={expenseForm.model_id}
          onChange={(e) => setExpenseForm({ ...expenseForm, model_id: e.target.value })}
        >
          <option value="">Entire Agency</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="next_due_date">Next Due Date</Label>
        <Input
          id="next_due_date"
          type="date"
          value={expenseForm.next_due_date}
          onChange={(e) => setExpenseForm({ ...expenseForm, next_due_date: e.target.value })}
        />
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses & Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Track all agency and model expenses — affects Dashboard Net Profit
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover-lift">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Track a new payment or subscription
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <ExpenseFormFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass hover-lift border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            <Repeat className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthly.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recurring monthly</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yearly</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalYearly.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Annual subscriptions</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agency Expenses</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${agencyExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Company-wide costs</p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Expenses</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${modelExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per-model costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>All Expenses ({expenses.length})</CardTitle>
          <CardDescription>Payments and subscriptions that affect your Net Profit</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No expenses yet. Add your first expense to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const CategoryIcon = categoryIcons[expense.category || 'other'] || DollarSign
                const modelName = models.find(m => m.id === expense.model_id)?.name
                
                return (
                  <div
                    key={expense.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      expense.status === 'paid' ? 'bg-green-500/10' : 'bg-muted'
                    }`}>
                      <CategoryIcon className={`w-5 h-5 ${
                        expense.status === 'paid' ? 'text-green-500' : 'text-muted-foreground'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="font-semibold">{expense.name}</h3>
                          {expense.description && (
                            <p className="text-sm text-muted-foreground">{expense.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {categoryLabels[expense.category || 'other']}
                            </Badge>
                            {expense.is_recurring && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Repeat className="w-3 h-3" />
                                {expense.frequency}
                              </Badge>
                            )}
                            {modelName ? (
                              <Badge className="text-xs bg-primary">
                                {modelName}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Agency-wide
                              </Badge>
                            )}
                            {expense.status === 'paid' && (
                              <Badge className="text-xs bg-green-500">Paid</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${Number(expense.amount).toLocaleString()}</p>
                          {expense.next_due_date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <Calendar className="w-3 h-3" />
                              Due {new Date(expense.next_due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditDialog(expense)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={isDeleting === expense.id}
                      >
                        {isDeleting === expense.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingExpense(null)
          resetForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditExpense} className="space-y-4">
            <ExpenseFormFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingExpense(null); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
