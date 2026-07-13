'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Service worker registration failed', error)
      })
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const wasDismissed = localStorage.getItem('pwa-install-dismissed') === '1'
    setDismissed(isStandalone || wasDismissed || !isIos)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      if (!wasDismissed && !isStandalone) setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (dismissed) return null

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setDismissed(true)
      setInstallPrompt(null)
      return
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) setShowIosHelp(true)
  }

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-sm rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-96">
      <button onClick={dismiss} aria-label="Dismiss install prompt" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">✕</button>
      <div className="flex items-start gap-3 pr-8">
        <Image src="/icon-192.png" alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-xl" />
        <div>
          <div className="font-semibold text-gray-900">Install AuraXpress</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">Open it like an app and get faster repeat visits.</p>
        </div>
      </div>
      {showIosHelp ? (
        <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p>
      ) : (
        <button onClick={install} className="mt-3 min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Install app</button>
      )}
    </div>
  )
}
