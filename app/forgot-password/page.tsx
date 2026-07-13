'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not request a reset link.')
      setMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-2xl font-bold tracking-tight text-white">Aura<span className="text-indigo-400">Xpress</span></Link>
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-bold text-gray-800">Forgot password?</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">Enter your verified email address and we’ll send a secure reset link.</p>
          {message && <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          <label className="mt-5 block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="you@company.com" />
          </label>
          <button disabled={loading} className="mt-6 min-h-12 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
          <p className="mt-5 text-center text-sm"><Link href="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link></p>
        </form>
      </div>
    </main>
  )
}
