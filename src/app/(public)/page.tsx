import { Navbar } from '@/components/marketing/navbar'
import { HeroSection } from '@/components/marketing/hero-section'
import { TrustTicker } from '@/components/marketing/trust-ticker'
import { FeatureBento } from '@/components/marketing/feature-bento'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import { CtaSection } from '@/components/marketing/cta-section'
import { Footer } from '@/components/marketing/footer'

export const metadata = {
  title: 'OnyxOS - The Operating System for Elite OF Agencies',
  description: 'Replace 10 tools with 1. Manage Chatters, Automate Content, and Dominate Traffic from a single Command Center.',
  openGraph: {
    title: 'OnyxOS - The Operating System for Elite OF Agencies',
    description: 'Replace 10 tools with 1. Manage Chatters, Automate Content, and Dominate Traffic from a single Command Center.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <HeroSection />
      <TrustTicker />
      <FeatureBento />
      <ComparisonTable />
      <CtaSection />
      <Footer />
    </main>
  )
}
