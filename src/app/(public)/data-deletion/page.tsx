import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Clock, Shield, Trash2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Data Deletion | OnyxOS',
  description: 'Request deletion of your data from OnyxOS',
}

export default function DataDeletionPage() {
  return (
    <div className="text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Data Deletion Request</h1>
        <p className="text-zinc-400 mb-8">
          Remove your data from OnyxOS in compliance with GDPR and platform policies.
        </p>

        <div className="space-y-6">
          {/* Info Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Your Data, Your Control
              </CardTitle>
              <CardDescription className="text-zinc-400">
                We respect your privacy and make it easy to delete your data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-300">
                If you've connected your social media accounts to OnyxOS and wish to have 
                your data deleted, you have two options:
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Option 1 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <h3 className="font-semibold text-white mb-2">Self-Service</h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Disconnect your accounts directly from your dashboard. This removes 
                    OAuth tokens and stops data collection.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/dashboard">Go to Dashboard</a>
                  </Button>
                </div>

                {/* Option 2 */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <h3 className="font-semibold text-white mb-2">Full Deletion</h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Request complete removal of all your data, including historical 
                    analytics and account information.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:privacy@behave.ro?subject=Data%20Deletion%20Request">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Request
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Deletion Process
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Submit Request</h4>
                    <p className="text-sm text-zinc-400">
                      Email privacy@behave.ro with your account email and request type.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Verification</h4>
                    <p className="text-sm text-zinc-400">
                      We'll verify your identity to protect against unauthorized requests.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Processing</h4>
                    <p className="text-sm text-zinc-400">
                      We process all deletion requests within <strong>48 hours</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Confirmation</h4>
                    <p className="text-sm text-zinc-400">
                      You'll receive email confirmation once your data has been deleted.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Gets Deleted */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                What Gets Deleted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Social media connection tokens (OAuth)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Historical analytics data (followers, views, engagement)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Profile information (username, avatar)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Chat notes and CRM data
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Uploaded content assets
                </li>
              </ul>
              <p className="text-sm text-zinc-500 mt-4">
                Note: Aggregated, anonymized statistics may be retained for internal 
                analytics purposes.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
            <p className="text-zinc-400 mb-4">
              Contact our privacy team for any questions about data handling.
            </p>
            <p className="text-zinc-300">
              <strong>Email:</strong> privacy@behave.ro<br />
              <strong>Response Time:</strong> Within 24 hours
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
