import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/sonner'
import { AlfredFloatingChat } from '@/components/alfred/floating-chat'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgencyOS - Fanvue CRM',
  description: 'The ultimate CRM for Fanvue model management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
        <AlfredFloatingChat />
      </body>
    </html>
  )
}
