'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PasswordStrength from '@/components/PasswordStrength'
import { validatePassword } from '@/lib/password'

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>
}

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const passwordError = validatePassword(password)
    if (passwordError) return setError(passwordError)
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not reset password.')
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-2xl font-bold tracking-tight text-white">Aura<span className="text-indigo-400">Xpress</span></Link>
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-bold text-gray-800">Choose a new password</h1>
          {success ? (
            <div className="mt-5">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Your password has been changed successfully.</div>
              <Link href="/login" className="mt-5 flex min-h-12 items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white">Sign in</Link>
            </div>
          ) : (
            <>
              {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
              {!token && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">This reset link is missing its security token.</div>}
              <label className="mt-5 block">
                <span className="mb-1 block text-sm font-medium text-gray-700">New password</span>
                <input type="password" required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <PasswordStrength password={password} />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</span>
                <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </label>
              <button disabled={loading || !token} className="mt-6 min-h-12 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Changing…' : 'Change password'}</button>
            </>
          )}
        </form>
      </div>
    </main>
  )
}
