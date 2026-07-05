'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', { email, password, redirect: false })

    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Mini nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <Link href="/" className="text-2xl font-bold text-white tracking-tight">Aura<span className="text-indigo-400">Xpress</span></Link>
          <div className="flex gap-4 text-sm text-indigo-300">
            <Link href="/features" className="hover:text-white transition">Features</Link>
            <Link href="/pricing"  className="hover:text-white transition">Pricing</Link>
          </div>
        </div>
        <div className="text-center mb-8">
          <p className="text-indigo-300 text-lg">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Sign in</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            No account?{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline font-medium">Sign up free</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
