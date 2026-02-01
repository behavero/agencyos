import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/sonner'
import { AlfredFloatingChat } from '@/components/alfred/floating-chat'
import './globals.css'

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
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans antialiased text-zinc-50">
        {children}
        <Toaster />
        <AlfredFloatingChat />
      </body>
    </html>
  )
}
