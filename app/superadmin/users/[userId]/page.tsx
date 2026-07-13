'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import PasswordStrength from '@/components/PasswordStrength'
import { validatePassword } from '@/lib/password'

type Value = string | number | null
type Row = Record<string, Value>

interface UserDetailResponse {
  user: Row
  vitals: { practice: Row; billing: Row; usage: Row; content: Row }
  recentAttempts: Row[]
  recentPayments: Row[]
  usageBreakdown: Row[]
}

const SUBSCRIPTION_TYPES = ['free', 'pro_trial', 'pro']
const ACCOUNT_STATUSES = ['active', 'suspended', 'pending_verification']
const USER_ROLES = ['user', 'superadmin']

export default function AdminUserPage({ params }: { params: { userId: string } }) {
  const [data, setData] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/users/${params.userId}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not load user.')
      setData(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load user.')
    } finally {
      setLoading(false)
    }
  }, [params.userId])

  useEffect(() => { load() }, [load])

  async function act(payload: Record<string, unknown>, successMessage: string) {
    setWorking(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: params.userId, ...payload }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Action failed.')
      setMessage(body.message ?? successMessage)
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
      return false
    } finally {
      setWorking(false)
    }
  }

  if (loading && !data) return <div className="p-6 text-sm text-gray-400">Loading user…</div>
  if (!data) return <div className="p-6 text-sm text-red-600">{error || 'User not found.'}</div>

  const { user, vitals } = data
  const updateUser = (patch: Row) => setData(current => current ? { ...current, user: { ...current.user, ...patch } } : current)

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:mx-0 lg:p-8">
      <Link href="/superadmin" className="text-sm font-medium text-indigo-600 hover:underline">← Back to Superadmin</Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <StatusBadge value={String(user.account_status)} />
          </div>
          <div className="mt-1 text-sm text-gray-500">{user.email}</div>
          <div className="mt-1 text-xs text-gray-400">Joined {formatDate(user.created_at)} · {user.email_verified_at ? `Verified ${formatDate(user.email_verified_at)}` : 'Email not verified'}</div>
        </div>
      </div>

      {(message || error) && <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{error || message}</div>}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Vital label="Sessions" value={formatCount(vitals.practice.session_count)} />
        <Vital label="Attempts" value={formatCount(vitals.practice.attempt_count)} />
        <Vital label="Average score" value={`${formatDecimal(vitals.practice.avg_score)}/100`} />
        <Vital label="Practice" value={`${formatDecimal(vitals.practice.practice_minutes)} min`} />
        <Vital label="AI calls" value={formatCount(vitals.usage.call_count)} />
        <Vital label="AI cost" value={`$${formatMoney(vitals.usage.cost_usd)}`} />
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Account management">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Plan" value={String(user.subscription_tier)} options={SUBSCRIPTION_TYPES} onChange={value => updateUser({ subscription_tier: value })} />
            <Select label="Status" value={String(user.account_status)} options={ACCOUNT_STATUSES} onChange={value => updateUser({ account_status: value })} />
            <Select label="Role" value={String(user.user_role)} options={USER_ROLES} onChange={value => updateUser({ user_role: value })} />
          </div>
          <div className="text-xs text-gray-400">Access ends: {user.subscription_ends ? formatDate(user.subscription_ends) : 'No end date'}</div>
          <div className="flex flex-wrap gap-2">
            <button disabled={working} onClick={() => act({ action: 'update_user', subscription_tier: user.subscription_tier, account_status: user.account_status, user_role: user.user_role }, 'User updated')} className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save changes</button>
            <button disabled={working} onClick={() => act({ action: 'extend_trial', days: 7 }, 'Trial extended by 7 days')} className="min-h-11 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 disabled:opacity-60">Add 7 trial days</button>
          </div>
        </Panel>

        <Panel title="Set and email password">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">New password</span>
            <input type="password" value={password} autoComplete="new-password" onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <PasswordStrength password={password} />
          </label>
          <p className="text-xs leading-relaxed text-gray-400">The new password is applied immediately and sent to {user.email}.</p>
          <button disabled={working || Boolean(validatePassword(password))} onClick={async () => { if (await act({ action: 'set_password', password }, 'Password changed and emailed to user')) setPassword('') }} className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Set & email password</button>
        </Panel>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Vital label="XP" value={formatCount(user.xp)} />
        <Vital label="Level" value={formatCount(user.level)} />
        <Vital label="Streak" value={`${formatCount(user.streak_days)}d`} />
        <Vital label="Best score" value={`${formatCount(vitals.practice.best_score)}/100`} />
        <Vital label="Average WPM" value={formatDecimal(vitals.practice.avg_wpm)} />
        <Vital label="Paid" value={`₹${Math.round(Number(vitals.billing.paid_amount_paise || 0) / 100).toLocaleString('en-IN')}`} />
        <Vital label="Guides" value={formatCount(vitals.content.guide_count)} />
        <Vital label="Custom scenarios" value={formatCount(vitals.content.scenario_count)} />
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Panel title="Recent practice attempts">
          {!data.recentAttempts.length ? <Empty>No practice attempts yet.</Empty> : data.recentAttempts.map(attempt => (
            <div key={String(attempt.id)} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-3">
              <div><div className="text-sm font-semibold text-gray-800">Score {formatCount(attempt.score_overall)}/100</div><div className="mt-0.5 text-xs text-gray-400">{formatDate(attempt.created_at)}</div></div>
              <div className="text-right text-xs text-gray-500">{formatDecimal(attempt.words_per_minute)} WPM<br />{formatDecimal(attempt.duration_sec)} sec</div>
            </div>
          ))}
        </Panel>
        <Panel title="Payments">
          {!data.recentPayments.length ? <Empty>No payment orders yet.</Empty> : data.recentPayments.map(payment => (
            <div key={String(payment.id)} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-3">
              <div><div className="text-sm font-semibold text-gray-800">{payment.plan}</div><div className="mt-0.5 text-xs text-gray-400">{payment.receipt} · {formatDate(payment.created_at)}</div></div>
              <div className="text-right"><div className="text-sm font-semibold text-gray-800">₹{Math.round(Number(payment.amount || 0) / 100)}</div><div className="text-xs text-gray-500">{payment.status}</div></div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="mt-6"><Panel title="AI usage breakdown">
        {!data.usageBreakdown.length ? <Empty>No AI usage yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-gray-400"><tr><th className="pb-2">Type</th><th className="pb-2">Model</th><th className="pb-2">Calls</th><th className="pb-2">Tokens</th><th className="pb-2 text-right">Cost</th></tr></thead><tbody className="divide-y divide-gray-100">{data.usageBreakdown.map((item, index) => <tr key={`${item.call_type}-${item.model}-${index}`}><td className="py-2.5">{item.call_type}</td><td className="py-2.5">{item.model}</td><td className="py-2.5">{formatCount(item.call_count)}</td><td className="py-2.5">{formatCount(item.total_tokens)}</td><td className="py-2.5 text-right">${formatMoney(item.cost_usd)}</td></tr>)}</tbody></table></div>
        )}
      </Panel></div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2><div className="space-y-3">{children}</div></section> }
function Vital({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div><div className="mt-1 text-lg font-bold text-gray-900">{value}</div></div> }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">{children}</div> }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label><span className="mb-1 block text-xs font-medium text-gray-500">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800">{options.map(option => <option key={option}>{option}</option>)}</select></label> }
function StatusBadge({ value }: { value: string }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value === 'active' ? 'bg-green-100 text-green-700' : value === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{value}</span> }
function formatCount(value: Value) { return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }) }
function formatDecimal(value: Value) { return Number(value || 0).toFixed(1) }
function formatMoney(value: Value) { return Number(value || 0).toFixed(4) }
function formatDate(value: Value) { if (!value) return '—'; try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value))) } catch { return String(value) } }
