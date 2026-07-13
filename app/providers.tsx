'use client'
import { SessionProvider } from 'next-auth/react'
import dynamic from 'next/dynamic'

const PWAInstall = dynamic(() => import('@/components/PWAInstall'), { ssr: false })

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PWAInstall />
    </SessionProvider>
  )
}
