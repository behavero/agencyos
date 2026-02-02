import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OnyxOS',
  description: 'Agency Management Platform',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
