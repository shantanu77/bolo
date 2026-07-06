'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const PRO_AMOUNT = 49900

interface BillingStatus {
  subscription_tier: string
  subscription_ends: string | null
  isActive: boolean
  isTrial: boolean
  plan: {
    amount: number
    amount_rupees: number
    currency: string
    duration_days: number
  }
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', callback: (response: unknown) => void) => void
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

export default function BillingPage() {
  const { data: session, update } = useSession()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutReady, setCheckoutReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/status')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load billing status.')
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing status.')
    } finally {
      setLoading(false)
    }
  }

  async function startCheckout() {
    setError('')
    setMessage('')

    if (!window.Razorpay || !checkoutReady) {
      setError('Payment checkout is still loading. Please try again in a moment.')
      return
    }

    setPaying(true)
    try {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: status?.plan.amount ?? PRO_AMOUNT, currency: 'INR' }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error ?? 'Could not create payment order.')

      const razorpay = new window.Razorpay({
        key: order.key_id ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'AuraXpress',
        description: 'AuraXpress Pro monthly plan',
        order_id: order.order_id,
        prefill: {
          name: session?.user?.name ?? '',
          email: session?.user?.email ?? '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setPaying(false)
            setMessage('Payment was cancelled. You can try again anytime.')
          },
        },
        handler: async (response: RazorpayPaymentResponse) => {
          await verifyPayment(response)
        },
      })

      razorpay.on('payment.failed', response => {
        console.error('Razorpay payment failed', response)
        setError('Payment failed. Please try another method or try again.')
        setPaying(false)
      })

      razorpay.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment.')
      setPaying(false)
    }
  }

  async function verifyPayment(response: RazorpayPaymentResponse) {
    try {
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      })
      const data = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(data.error ?? 'Payment verification failed.')

      setMessage('Payment received. Pro access is active.')
      await update({ user: { subscription_tier: 'pro', subscription_ends: data.subscription_ends ?? null } })
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.')
    } finally {
      setPaying(false)
    }
  }

  const endsText = status?.subscription_ends ? formatDate(status.subscription_ends) : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto lg:mx-0">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() => setError('Could not load Razorpay Checkout. Please refresh and try again.')}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your AuraXpress Pro access and payments.</p>
      </div>

      {(message || error) && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">AuraXpress Pro</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-bold text-gray-900">₹499</span>
                <span className="mb-1 text-sm text-gray-400">/ month</span>
              </div>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Continue with unlimited practice, AI-generated categories, voice bio personalisation, progress analytics,
                and custom categories after your 7-day trial ends.
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              {loading ? 'Checking plan...' : getPlanLabel(status)}
              {endsText && <div className="mt-1 text-xs text-indigo-500">Access until {endsText}</div>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Unlimited practice sessions',
              'AI-generated personalised categories',
              'Create custom categories',
              'Full progress analytics',
              'Leaderboard participation',
              'Daily challenge and badges',
            ].map(feature => (
              <div key={feature} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="font-semibold text-indigo-600">✓</span> {feature}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={startCheckout}
            disabled={paying || loading}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
          >
            {paying ? 'Opening payment...' : status?.subscription_tier === 'pro' ? 'Extend Pro access' : 'Pay ₹499 and activate Pro'}
          </button>
        </section>

        <aside className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Payment Security</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>Payments are processed by Razorpay Standard Checkout.</p>
            <p>The payment is marked successful only after the server verifies Razorpay&apos;s HMAC signature.</p>
            <p>Your card, UPI, or banking details are not stored by AuraXpress.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function getPlanLabel(status: BillingStatus | null) {
  if (!status) return 'Plan unavailable'
  if (status.subscription_tier === 'pro') return 'Pro active'
  if (status.isTrial && status.isActive) return '7-day Pro trial active'
  if (status.isTrial && !status.isActive) return 'Trial finished'
  return 'Free plan'
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}
