import Link from 'next/link'
import Image from 'next/image'

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-indigo-950 px-5 py-10 text-center text-white">
      <div className="max-w-sm">
        <Image src="/icon-192.png" alt="AuraXpress" width={80} height={80} unoptimized className="mx-auto h-20 w-20 rounded-2xl shadow-xl" />
        <h1 className="mt-6 text-2xl font-bold">You’re offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-indigo-200">Reconnect to continue coaching, practice sessions, and account updates.</p>
        <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700">Try again</Link>
      </div>
    </main>
  )
}
