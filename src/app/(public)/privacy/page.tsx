import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | OnyxOS',
  description: 'Privacy Policy for OnyxOS Agency Management Platform',
}

export default function PrivacyPage() {
  return (
    <div className="text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 2, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-zinc-300 leading-relaxed">
              OnyxOS ("we", "our", or "us") is an internal agency management platform 
              operated by <strong>Behave SRL</strong>. This Privacy Policy explains how we collect, 
              use, and protect your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              When you connect your social media accounts (Instagram, Facebook, YouTube, TikTok), 
              we collect:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Account identifiers (username, profile ID)</li>
              <li>Public profile information (name, avatar)</li>
              <li>Analytics data (followers, views, reach, engagement)</li>
              <li>OAuth tokens (securely stored for API access)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Data</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Your data is used exclusively for:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Internal agency analytics</strong> - tracking performance metrics</li>
              <li><strong>Reporting</strong> - generating insights for agency staff</li>
              <li><strong>Platform functionality</strong> - enabling features like messaging and scheduling</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              We do <strong>NOT</strong> sell, share, or distribute your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Storage & Security</h2>
            <p className="text-zinc-300 leading-relaxed">
              All data is stored securely using industry-standard encryption. We use Supabase 
              (PostgreSQL) with Row Level Security (RLS) policies to ensure data isolation 
              between users. OAuth tokens are encrypted at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
            <p className="text-zinc-300 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide 
              services. You may request deletion at any time (see Section 7).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Services</h2>
            <p className="text-zinc-300 leading-relaxed">
              We integrate with the following platforms via their official APIs:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mt-4">
              <li>Meta (Facebook/Instagram) - Graph API</li>
              <li>Google (YouTube) - YouTube Data API v3</li>
              <li>Fanvue - Creator API</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              Each platform has its own privacy policy that governs their data practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect social accounts at any time</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              To exercise these rights, visit our{' '}
              <a href="/data-deletion" className="text-primary hover:underline">
                Data Deletion page
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Contact</h2>
            <p className="text-zinc-300 leading-relaxed">
              For privacy-related inquiries, contact us at:
            </p>
            <p className="text-zinc-300 mt-2">
              <strong>Behave SRL</strong><br />
              Email: privacy@behave.ro<br />
              Location: Romania, EU
            </p>
          </section>
        </div>

      </div>
    </div>
  )
}
