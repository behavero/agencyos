'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, DollarSign, CheckCircle2, Clock, Calendar } from 'lucide-react'

export default function BillingClient() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Free Plan</CardTitle>
              <CardDescription>Currently active</CardDescription>
            </div>
            <Badge className="bg-primary text-lg px-4 py-2">$0/mo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Features:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Up to 3 models
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Basic analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Quest system
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Billing:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    No expiration
                  </li>

                  <li className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Unlimited usage
                  </li>
                </ul>
              </div>
            </div>
            <Button className="w-full" size="lg">
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Payment Method</CardTitle>
          </div>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No payment method on file</p>
            <Button variant="outline">Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardDescription>View your past payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
