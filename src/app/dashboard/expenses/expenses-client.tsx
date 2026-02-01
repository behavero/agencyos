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
  Check,
  X,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface ExpensesClientProps {
  agencyId?: string
}

// Mock expenses data
const mockExpenses = [
  {
    id: '1',
    name: 'Chatter Salaries',
    amount: 2100,
    frequency: 'monthly',
    category: 'salaries',
    assignedTo: 'agency',
    nextDue: '2026-02-15',
    recurring: true,
    status: 'active',
  },
  {
    id: '2',
    name: 'Canva Pro Subscription',
    amount: 45,
    frequency: 'monthly',
    category: 'software',
    assignedTo: 'all_models',
    nextDue: '2026-02-10',
    recurring: true,
    status: 'active',
  },
  {
    id: '3',
    name: 'ChatGPT Plus (Lana)',
    amount: 20,
    frequency: 'monthly',
    category: 'software',
    assignedTo: 'model_1',
    modelName: 'Lana Valentine',
    nextDue: '2026-02-05',
    recurring: true,
    status: 'active',
  },
  {
    id: '4',
    name: 'Instagram Ads',
    amount: 450,
    frequency: 'monthly',
    category: 'marketing',
    assignedTo: 'agency',
    nextDue: '2026-02-20',
    recurring: true,
    status: 'active',
  },
  {
    id: '5',
    name: 'iPhone 15 Pro (Content)',
    amount: 1200,
    frequency: 'one-time',
    category: 'equipment',
    assignedTo: 'model_1',
    modelName: 'Lana Valentine',
    nextDue: '2026-02-01',
    recurring: false,
    status: 'paid',
  },
  {
    id: '6',
    name: 'OnyxOS Subscription',
    amount: 49,
    frequency: 'monthly',
    category: 'software',
    assignedTo: 'agency',
    nextDue: '2026-02-08',
    recurring: true,
    status: 'active',
  },
]

const categoryIcons: Record<string, any> = {
  salaries: Users,
  software: DollarSign,
  marketing: TrendingUp,
  equipment: Building2,
}

export default function ExpensesClient({ agencyId }: ExpensesClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    category: 'software',
    assignedTo: 'agency',
  })

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement add expense
    console.log('Add expense:', expenseForm)
    setIsAddDialogOpen(false)
  }

  const totalMonthly = mockExpenses
    .filter(e => e.recurring && e.status === 'active')
    .reduce((sum, e) => sum + e.amount, 0)

  const agencyExpenses = mockExpenses.filter(e => e.assignedTo === 'agency').reduce((sum, e) => sum + e.amount, 0)
  const modelExpenses = mockExpenses.filter(e => e.assignedTo !== 'agency').reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses & Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Track all agency and model expenses
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
              <div>
                <Label htmlFor="name">Expense Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Canva Pro"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  value={expenseForm.frequency}
                  onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}
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
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="software">Software & Tools</option>
                  <option value="salaries">Salaries</option>
                  <option value="marketing">Marketing</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <select
                  id="assignedTo"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  value={expenseForm.assignedTo}
                  onChange={(e) => setExpenseForm({ ...expenseForm, assignedTo: e.target.value })}
                >
                  <option value="agency">Entire Agency</option>
                  <option value="all_models">All Models</option>
                  <option value="model_1">Specific Model</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass hover-lift border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            <Repeat className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthly.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recurring expenses</p>
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
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Payments and subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockExpenses.map((expense) => {
              const CategoryIcon = categoryIcons[expense.category] || DollarSign
              
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {expense.category}
                          </Badge>
                          {expense.recurring && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Repeat className="w-3 h-3" />
                              {expense.frequency}
                            </Badge>
                          )}
                          {expense.assignedTo === 'agency' ? (
                            <Badge variant="secondary" className="text-xs">
                              Agency-wide
                            </Badge>
                          ) : expense.assignedTo === 'all_models' ? (
                            <Badge variant="secondary" className="text-xs">
                              All Models
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-primary">
                              {expense.modelName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${expense.amount.toLocaleString()}</p>
                        {expense.recurring && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {expense.nextDue}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
