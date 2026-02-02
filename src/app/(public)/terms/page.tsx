import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | OnyxOS',
  description: 'Terms of Service for OnyxOS Agency Management Platform',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 2, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              By accessing or using OnyxOS ("the Platform"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Platform Description</h2>
            <p className="text-zinc-300 leading-relaxed">
              OnyxOS is an <strong>internal agency management tool</strong> designed for 
              authorized staff of Behave SRL and its affiliated agencies. The Platform 
              provides social media analytics, creator management, and business intelligence 
              features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Authorized Users</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Access to OnyxOS is restricted to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Employees of Behave SRL</li>
              <li>Contractors with valid service agreements</li>
              <li>Creators who have granted explicit consent</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              Unauthorized access is strictly prohibited and may result in legal action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Account Responsibilities</h2>
            <p className="text-zinc-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your login credentials 
              and for all activities that occur under your account. You must immediately notify 
              us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Acceptable Use</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Share your account credentials with unauthorized parties</li>
              <li>Attempt to access data belonging to other agencies</li>
              <li>Use the Platform for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Interfere with the security or integrity of the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Integrations</h2>
            <p className="text-zinc-300 leading-relaxed">
              The Platform integrates with third-party services (Meta, Google, Fanvue). Your 
              use of these integrations is subject to the respective platform's terms of 
              service. We are not responsible for changes to third-party APIs or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
            <p className="text-zinc-300 leading-relaxed">
              All content, features, and functionality of OnyxOS are owned by Behave SRL 
              and are protected by international copyright, trademark, and other intellectual 
              property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-zinc-300 leading-relaxed">
              The Platform is provided "AS IS" without warranties of any kind. We do not 
              guarantee that the Platform will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-zinc-300 leading-relaxed">
              To the maximum extent permitted by law, Behave SRL shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages arising from 
              your use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Termination</h2>
            <p className="text-zinc-300 leading-relaxed">
              We reserve the right to suspend or terminate your access to the Platform at 
              any time, with or without cause, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update these Terms at any time. Continued use of the Platform after 
              changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Governing Law</h2>
            <p className="text-zinc-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of 
              Romania and the European Union, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Contact</h2>
            <p className="text-zinc-300 leading-relaxed">
              For questions about these Terms, contact:
            </p>
            <p className="text-zinc-300 mt-2">
              <strong>Behave SRL</strong><br />
              Email: legal@behave.ro<br />
              Location: Romania, EU
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <a 
            href="/dashboard" 
            className="text-primary hover:underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
