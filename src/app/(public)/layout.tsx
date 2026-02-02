import { Metadata } from 'next'
import Link from 'next/link'
import { Leaf } from 'lucide-react'

export const metadata: Metadata = {
  title: 'OnyxOS',
  description: 'Agency Management Platform',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
