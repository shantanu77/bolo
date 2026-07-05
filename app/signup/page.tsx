'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.push('/onboarding')
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
          <p className="text-indigo-300 text-lg">Start speaking better today</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Create your account</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {[
              { label: 'Your name',  key: 'name',     type: 'text',     placeholder: 'Rahul Sharma' },
              { label: 'Email',      key: 'email',    type: 'email',    placeholder: 'you@company.com' },
              { label: 'Password',   key: 'password', type: 'password', placeholder: 'Min. 8 characters' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  required
                  minLength={f.key === 'password' ? 8 : undefined}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
