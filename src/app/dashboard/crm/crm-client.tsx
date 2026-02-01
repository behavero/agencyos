'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  Lock,
  FileText,
  Zap,
  Target,
  Ban
} from 'lucide-react'

export default function CRMClient() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM - Employee Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage team performance, content scripts, and automations
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employee-stats" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="employee-stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Employee Statistics
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2">
            <Lock className="w-4 h-4" />
            Vault
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="w-4 h-4" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="banned-keywords" className="gap-2">
            <Ban className="w-4 h-4" />
            Banned Keywords
          </TabsTrigger>
        </TabsList>

        {/* Employee Statistics */}
        <TabsContent value="employee-stats" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>Track team member statistics and commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Employee statistics will appear here once you add team members
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vault */}
        <TabsContent value="vault" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Content Vault</CardTitle>
              <CardDescription>Manage PPV content and media library</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Upload and organize your content vault
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scripts */}
        <TabsContent value="scripts" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Chat Scripts</CardTitle>
              <CardDescription>Pre-written messages for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Create chat scripts for openers, objections, and high spenders
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations */}
        <TabsContent value="automations" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Automations</CardTitle>
              <CardDescription>Auto-responses and workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Set up automated messages and workflows
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banned Keywords */}
        <TabsContent value="banned-keywords" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Banned Keywords</CardTitle>
              <CardDescription>Words and phrases to avoid in chats</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Add keywords that should not be used in conversations
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
