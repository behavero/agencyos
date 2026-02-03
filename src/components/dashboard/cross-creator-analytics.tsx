'use client'

/**
 * Cross-Creator Analytics Component
 * Comprehensive view of analytics across all creators in an agency
 * Part of Phase A: Complete the Core Loop
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VIPFansList } from '@/components/creators/vip-fans-list'
import { SubscriberTrendsChart } from '@/components/dashboard/subscriber-trends-chart'
import { Users, TrendingUp, DollarSign, Trophy } from 'lucide-react'

interface CrossCreatorAnalyticsProps {
  className?: string
}

export function CrossCreatorAnalytics({ className }: CrossCreatorAnalyticsProps) {
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            Cross-Creator Analytics
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              Insights Across All Creators
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vip-fans">VIP Fans</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Top 5 VIP Fans Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top 5 VIP Fans
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VIPFansList />
                  </CardContent>
                </Card>

                {/* 30-Day Subscriber Trend Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                      Recent Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SubscriberTrendsChart days={30} />
                  </CardContent>
                </Card>
              </div>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">Top Revenue Source</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Identify which creator drives the most revenue and cross-promote their
                        content.
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h4 className="font-semibold">Shared Fans</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Discover fans who subscribe to multiple creators for bundled offers.
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold">Growth Opportunities</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Analyze subscriber trends to identify which creators need more focus.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* VIP Fans Tab - Full List */}
            <TabsContent value="vip-fans" className="space-y-4">
              <VIPFansList />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">VIP Fan Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">📈 How to Use This Data</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>
                        <strong>Fans with 2+ creators:</strong> Perfect candidates for bundled
                        subscriptions or exclusive agency-wide content
                      </li>
                      <li>
                        <strong>Top spenders:</strong> Prioritize personalized attention and premium
                        PPV content
                      </li>
                      <li>
                        <strong>High message count:</strong> Indicates engagement - consider loyalty
                        rewards or VIP perks
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">🎯 Suggested Actions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Send a personalized thank-you message to top 10 spenders</li>
                      <li>
                        Create exclusive content bundles for fans subscribed to multiple creators
                      </li>
                      <li>Offer early access to new content for VIP fans</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab - Full Charts */}
            <TabsContent value="trends" className="space-y-4">
              <SubscriberTrendsChart days={90} />

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Retention Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track how many subscribers stay active month-over-month
                    </p>
                    <div className="text-center py-8">
                      <p className="text-4xl font-bold text-purple-600">--</p>
                      <p className="text-sm text-muted-foreground mt-2">Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Churn Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Understand why subscribers cancel and when
                    </p>
                    <div className="text-center py-8">
                      <p className="text-4xl font-bold text-red-600">--</p>
                      <p className="text-sm text-muted-foreground mt-2">Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Comparison Tab - Creator Leaderboard */}
            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Creator Performance Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Creator comparison view coming in Phase B
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
