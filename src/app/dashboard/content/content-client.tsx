'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Target,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Filter,
  BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

// Local type definition
interface ContentAnalysis {
  id: string
  post_url?: string
  platform?: string
  views?: number
  conversion_rate?: number
  ai_tags?: any
  performance_score?: number
}

interface ContentIntelClientProps {
  contentData: ContentAnalysis[]
}

export default function ContentIntelClient({ contentData }: ContentIntelClientProps) {
  // Mock data for demonstration
  const topContent = [
    {
      id: 1,
      thumbnail: '🔥',
      title: 'Gym Session - Pink Set',
      platform: 'Instagram',
      views: 125000,
      engagement: '12.5%',
      conversion: '8.2%',
      score: 95,
      tags: ['gym', 'pink_outfit', 'fitness'],
    },
    {
      id: 2,
      thumbnail: '💖',
      title: 'Car Selfie - Golden Hour',
      platform: 'TikTok',
      views: 98500,
      engagement: '15.2%',
      conversion: '6.8%',
      score: 89,
      tags: ['car', 'selfie', 'golden_hour'],
    },
    {
      id: 3,
      thumbnail: '✨',
      title: 'Mirror Pic - White Dress',
      platform: 'Instagram',
      views: 87200,
      engagement: '11.8%',
      conversion: '7.5%',
      score: 85,
      tags: ['mirror', 'dress', 'aesthetic'],
    },
    {
      id: 4,
      thumbnail: '🎀',
      title: 'Beach Day - Bikini',
      platform: 'TikTok',
      views: 156000,
      engagement: '18.3%',
      conversion: '5.2%',
      score: 82,
      tags: ['beach', 'bikini', 'summer'],
    },
  ]

  const performanceData = [
    { name: 'Mon', conversions: 12, views: 2400 },
    { name: 'Tue', conversions: 18, views: 3200 },
    { name: 'Wed', conversions: 25, views: 4100 },
    { name: 'Thu', conversions: 15, views: 2800 },
    { name: 'Fri', conversions: 32, views: 5200 },
    { name: 'Sat', conversions: 28, views: 4800 },
    { name: 'Sun', conversions: 22, views: 3600 },
  ]

  const platformData = [
    { name: 'Instagram', value: 45, color: '#3462EE' },
    { name: 'TikTok', value: 35, color: '#4A91A8' },
    { name: 'Twitter', value: 15, color: '#EFE347' },
    { name: 'Other', value: 5, color: '#999' },
  ]

  const winningTags = [
    { tag: 'gym', posts: 28, avgScore: 87 },
    { tag: 'car', posts: 24, avgScore: 85 },
    { tag: 'pink_outfit', posts: 19, avgScore: 82 },
    { tag: 'mirror', posts: 16, avgScore: 80 },
    { tag: 'selfie', posts: 35, avgScore: 78 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Content Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights to optimize your content strategy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84.5</div>
            <p className="text-xs text-muted-foreground">
              Out of 100 score
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2M</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              +15.3% this week
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13.2%</div>
            <p className="text-xs text-muted-foreground">
              Above industry avg
            </p>
          </CardContent>
        </Card>

        <Card className="glass hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.8%</div>
            <p className="text-xs text-muted-foreground">
              Profile visits / views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Views and conversions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  tick={{ fill: '#e4e4e7', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fill: '#e4e4e7', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    color: '#fff',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="conversions" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Content posted across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Winning Recipe */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-primary">🏆 Winning Recipe</CardTitle>
              <CardDescription>Top performing content patterns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h3 className="font-semibold mb-2">Best Performing Combination:</h3>
              <div className="flex flex-wrap gap-2">
                {winningTags.slice(0, 3).map((tag) => (
                  <Badge key={tag.tag} className="bg-primary">
                    {tag.tag} ({tag.avgScore} score)
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                💡 Posts with <strong>gym + car + pink_outfit</strong> average <strong>87% performance score</strong>
              </p>
            </div>

            {/* All Tags */}
            <div>
              <h4 className="text-sm font-medium mb-2">All High-Performing Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {winningTags.map((tag) => (
                  <Badge key={tag.tag} variant="outline">
                    #{tag.tag} ({tag.posts})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Content */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Highest scoring posts from the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topContent.map((content) => (
              <div
                key={content.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl">
                  {content.thumbnail}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold truncate">{content.title}</h3>
                    <Badge className="bg-gradient-to-r from-primary to-secondary">
                      {content.score} Score
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {content.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {content.engagement}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {content.conversion}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {content.platform}
                    </Badge>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {content.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <Button variant="ghost" size="icon">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
