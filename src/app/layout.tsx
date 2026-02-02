import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
// import { AlfredFloatingChat } from '@/components/alfred/floating-chat' // TODO: Fix AI SDK v6 compatibility
import './globals.css'

// Vega Style uses Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'OnyxOS - Agency Management',
  description: 'The ultimate CRM for Fanvue model management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
        {/* <AlfredFloatingChat /> */}
      </body>
    </html>
  )
}
