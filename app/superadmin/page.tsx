'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface AdminUser {
  id: string
  name: string
  email: string
  subscription_tier: string
  subscription_ends: string | null
  user_role: string
  account_status: string
  xp: number
  level: number
  streak_days: number
  created_at: string
  last_practiced: string | null
  session_count: number
  attempt_count: number
  last_attempt_at: string | null
  last_paid_at: string | null
  paid_amount_paise: number
  usage_call_count: number
  usage_total_tokens: number
  usage_cost_usd: number | string
  gpt_cost_usd: number | string
  tts_cost_usd: number | string
  stt_cost_usd: number | string
}

interface AdminSummaryResponse {
  generatedAt: string
  timezone: string
  summary: {
    growth: Record<string, number | string | null>
    funnel: Record<string, number | string | null>
    engagement: Record<string, number | string | null>
    revenue: Record<string, number | string | null>
    subscriptions: Record<string, number | string | null>
    content: Record<string, number | string | null>
    aiUsage: Record<string, number | string | null>
  }
  topUsage: Array<Record<string, number | string | null>>
  topUsers: Array<Record<string, number | string | null>>
}

const SUBSCRIPTION_TYPES = ['free', 'pro_trial', 'pro']
const ACCOUNT_STATUSES = ['active', 'suspended', 'pending_verification']
const USER_ROLES = ['user', 'superadmin']

export default function SuperadminPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [workingUserId, setWorkingUserId] = useState('')
  const [spamCleanupCandidates, setSpamCleanupCandidates] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [manualPayment, setManualPayment] = useState({
    userId: '',
    amount_rupees: 499,
    days: 30,
    notes: '',
    send_receipt: true,
  })
  const [receipt, setReceipt] = useState({
    userId: '',
    amount_rupees: 499,
    days: 30,
    receipt: '',
    notes: '',
  })
  const [passwordReset, setPasswordReset] = useState({ userId: '', password: '' })

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/superadmin/summary')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load dashboard summary.')
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard summary.')
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async (nextSearch = '') => {
    setLoading(true)
    setError('')
    try {
      const qs = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : ''
      const res = await fetch(`/api/superadmin/users${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load users.')
      setUsers(data.users ?? [])
      setSpamCleanupCandidates(Number(data.spamCleanupCandidates ?? 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  async function patchUser(userId: string, payload: Record<string, unknown>, success: string) {
    setWorkingUserId(userId)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Action failed.')
      setMessage(data.message ?? success)
      await Promise.all([loadUsers(search), loadSummary()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setWorkingUserId('')
    }
  }

  async function cleanupSpamAccounts() {
    if (!window.confirm(`Permanently delete ${spamCleanupCandidates} old unverified accounts with no activity or payment?`)) return
    setWorkingUserId('spam-cleanup')
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup_spam', confirmation: 'DELETE_UNVERIFIED_SPAM', days: 2 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Cleanup failed.')
      setMessage(`${data.deleted ?? 0} spam accounts deleted`)
      await Promise.all([loadUsers(search), loadSummary()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed.')
    } finally {
      setWorkingUserId('')
    }
  }

  function updateLocalUser(userId: string, patch: Partial<AdminUser>) {
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, ...patch } : user))
  }

  const canView = session?.user?.user_role === 'superadmin'

  if (canView === false) {
    return (
      <div className="p-6 text-sm text-red-600">Forbidden</div>
    )
  }

  const growth = summary?.summary.growth
  const funnel = summary?.summary.funnel
  const engagement = summary?.summary.engagement
  const revenue = summary?.summary.revenue
  const subscriptions = summary?.summary.subscriptions
  const content = summary?.summary.content
  const aiUsage = summary?.summary.aiUsage

  const verifiedRate = percent(growth?.verified_users, growth?.total_users)
  const activationRate = percent(funnel?.session_users, funnel?.total_users)
  const attemptRate = percent(funnel?.attempt_users, funnel?.total_users)
  const paidRate = percent(subscriptions?.active_pro, growth?.total_users)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto lg:mx-0">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Superadmin</h1>
          <p className="text-sm text-gray-500 mt-1">Manage registered users, trials, suspensions, and manual payments.</p>
        </div>
        <form
          onSubmit={event => {
            event.preventDefault()
            loadUsers(search)
          }}
          className="flex gap-2"
        >
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 lg:w-72"
          />
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Search
          </button>
        </form>
      </div>

      {(message || error) && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}

      <section className="mb-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={summaryLoading ? '...' : formatCount(growth?.total_users)}
            note={`${formatCount(growth?.new_users_30d)} new in last 30d`}
          />
          <StatCard
            label="DAU / WAU / MAU"
            value={summaryLoading ? '...' : `${formatCount(engagement?.dau)} / ${formatCount(engagement?.wau)} / ${formatCount(engagement?.mau)}`}
            note={`${formatCount(engagement?.sessions_30d)} sessions in last 30d`}
          />
          <StatCard
            label="Revenue this month"
            value={summaryLoading ? '...' : `₹${formatCount(revenue?.revenue_mtd_inr)}`}
            note={`${formatCount(revenue?.paid_orders_mtd)} paid orders this month`}
          />
          <StatCard
            label="AI cost this month"
            value={summaryLoading ? '...' : `$${formatMoney(aiUsage?.cost_mtd_usd)}`}
            note={`${formatCount(aiUsage?.tokens_mtd)} tokens this month`}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Business Snapshot">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetricLine label="New users today" value={formatCount(growth?.new_users_today)} />
              <MetricLine label="New users this month" value={formatCount(growth?.new_users_mtd)} />
              <MetricLine label="Verified users" value={`${formatCount(growth?.verified_users)} (${verifiedRate})`} />
              <MetricLine label="Active Pro users" value={`${formatCount(subscriptions?.active_pro)} (${paidRate})`} />
              <MetricLine label="Active trials" value={formatCount(subscriptions?.active_trials)} />
              <MetricLine label="Open unpaid orders" value={formatCount(revenue?.open_orders)} />
              <MetricLine label="Revenue today" value={`₹${formatCount(revenue?.revenue_today_inr)}`} />
              <MetricLine label="Revenue last 30 days" value={`₹${formatCount(revenue?.revenue_30d_inr)}`} />
              <MetricLine label="Expiring in 7 days" value={formatCount(subscriptions?.expiring_7d)} />
              <MetricLine label="Expired paid/trial access" value={formatCount(subscriptions?.expired_paid_access)} />
            </div>
          </Panel>

          <Panel title="Activation Funnel">
            <div className="space-y-3">
              <FunnelLine label="Users with persona" count={formatCount(funnel?.persona_users)} rate={percent(funnel?.persona_users, funnel?.total_users)} />
              <FunnelLine label="Users who started a session" count={formatCount(funnel?.session_users)} rate={activationRate} />
              <FunnelLine label="Users with at least one attempt" count={formatCount(funnel?.attempt_users)} rate={attemptRate} />
              <FunnelLine label="Users with learning guides" count={formatCount(funnel?.guide_users)} rate={percent(funnel?.guide_users, funnel?.total_users)} />
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Panel title="Practice Quality">
            <div className="space-y-3">
              <MetricLine label="Sessions today" value={formatCount(engagement?.sessions_today)} />
              <MetricLine label="Sessions yesterday" value={formatCount(engagement?.sessions_yesterday)} />
              <MetricLine label="Attempts today" value={formatCount(engagement?.attempts_today)} />
              <MetricLine label="Attempts last 30 days" value={formatCount(engagement?.attempts_30d)} />
              <MetricLine label="Average score (30d)" value={`${formatDecimal(engagement?.avg_score_30d)}/100`} />
              <MetricLine label="Average duration (30d)" value={`${formatDecimal(engagement?.avg_duration_30d)} sec`} />
              <MetricLine label="Average WPM (30d)" value={formatDecimal(engagement?.avg_wpm_30d)} />
              <MetricLine label="Average fillers (30d)" value={formatDecimal(engagement?.avg_fillers_30d)} />
            </div>
          </Panel>

          <Panel title="Content Usage">
            <div className="space-y-3">
              <MetricLine label="Default active scenarios" value={formatCount(content?.active_default_scenarios)} />
              <MetricLine label="Custom categories total" value={formatCount(content?.custom_categories_total)} />
              <MetricLine label="Custom categories (30d)" value={formatCount(content?.custom_categories_30d)} />
              <MetricLine label="Custom scenarios total" value={formatCount(content?.custom_scenarios_total)} />
              <MetricLine label="Custom scenarios (30d)" value={formatCount(content?.custom_scenarios_30d)} />
              <MetricLine label="Generation jobs (30d)" value={formatCount(content?.generation_jobs_30d)} />
              <MetricLine label="Learning guides total" value={formatCount(content?.learning_guides_total)} />
              <MetricLine label="Learning guides (30d)" value={formatCount(content?.learning_guides_30d)} />
            </div>
          </Panel>

          <Panel title="AI Usage">
            <div className="space-y-3">
              <MetricLine label="AI calls (30d)" value={formatCount(aiUsage?.calls_30d)} />
              <MetricLine label="Tokens today" value={formatCount(aiUsage?.tokens_today)} />
              <MetricLine label="Tokens last 7 days" value={formatCount(aiUsage?.tokens_7d)} />
              <MetricLine label="Tokens last 30 days" value={formatCount(aiUsage?.tokens_30d)} />
              <MetricLine label="AI cost today" value={`$${formatMoney(aiUsage?.cost_today_usd)}`} />
              <MetricLine label="AI cost last 7 days" value={`$${formatMoney(aiUsage?.cost_7d_usd)}`} />
              <MetricLine label="AI cost last 30 days" value={`$${formatMoney(aiUsage?.cost_30d_usd)}`} />
              <MetricLine label="AI cost this month" value={`$${formatMoney(aiUsage?.cost_mtd_usd)}`} />
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel title="Top AI Cost Buckets (30d)">
            {summaryLoading ? (
              <div className="text-sm text-gray-400">Loading summary...</div>
            ) : !summary?.topUsage.length ? (
              <div className="text-sm text-gray-400">No AI usage data yet.</div>
            ) : (
              <div className="space-y-3">
                {summary.topUsage.map((item, index) => (
                  <div key={`${item.call_type}-${item.model}-${index}`} className="rounded-lg border border-gray-100 px-3 py-2">
                    <div className="text-sm font-semibold text-gray-800">{item.call_type} / {item.model}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatCount(item.call_count)} calls · {formatCount(item.total_tokens)} tokens · ${formatMoney(item.cost_usd)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Top Active Users (30d)">
            {summaryLoading ? (
              <div className="text-sm text-gray-400">Loading summary...</div>
            ) : !summary?.topUsers.length ? (
              <div className="text-sm text-gray-400">No practice activity yet.</div>
            ) : (
              <div className="space-y-3">
                {summary.topUsers.map((user, index) => (
                  <div key={`${user.email}-${index}`} className="rounded-lg border border-gray-100 px-3 py-2">
                    <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatCount(user.attempts_30d)} attempts · avg {formatDecimal(user.avg_score_30d)}/100 · XP {formatCount(user.xp)} · streak {formatCount(user.streak_days)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {summary && (
          <div className="text-xs text-gray-400">
            Dashboard generated {formatDate(summary.generatedAt)} ({summary.timezone})
          </div>
        )}
      </section>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Set User Password">
          <AdminSelect label="User" value={passwordReset.userId} onChange={value => setPasswordReset(p => ({ ...p, userId: value }))}>
            <option value="">Select user</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
          </AdminSelect>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">New password</span>
            <input
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={passwordReset.password}
              onChange={event => setPasswordReset(p => ({ ...p, password: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <p className="text-xs text-gray-400">The password will be set immediately and emailed to the selected user.</p>
          <button
            disabled={!passwordReset.userId || passwordReset.password.length < 8 || workingUserId === passwordReset.userId}
            onClick={async () => {
              await patchUser(passwordReset.userId, { action: 'set_password', password: passwordReset.password }, 'Password changed and emailed to user')
              setPasswordReset(p => ({ ...p, password: '' }))
            }}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Set & Email Password
          </button>
        </Panel>

        <Panel title="Spam Account Cleanup">
          <div className="rounded-lg bg-gray-50 px-3 py-3">
            <div className="text-2xl font-bold text-gray-900">{spamCleanupCandidates}</div>
            <div className="mt-1 text-xs text-gray-500">Unverified accounts older than 48 hours with no activity or successful payment.</div>
          </div>
          <button
            disabled={!spamCleanupCandidates || workingUserId === 'spam-cleanup'}
            onClick={cleanupSpamAccounts}
            className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {workingUserId === 'spam-cleanup' ? 'Cleaning...' : 'Delete Spam Accounts'}
          </button>
        </Panel>

        <Panel title="Manual Payment">
          <AdminSelect label="User" value={manualPayment.userId} onChange={value => setManualPayment(p => ({ ...p, userId: value }))}>
            <option value="">Select user</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
          </AdminSelect>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Amount (₹)" value={manualPayment.amount_rupees} onChange={value => setManualPayment(p => ({ ...p, amount_rupees: value }))} />
            <NumberField label="Access days" value={manualPayment.days} onChange={value => setManualPayment(p => ({ ...p, days: value }))} />
          </div>
          <TextField label="Notes" value={manualPayment.notes} onChange={value => setManualPayment(p => ({ ...p, notes: value }))} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={manualPayment.send_receipt}
              onChange={event => setManualPayment(p => ({ ...p, send_receipt: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            Send receipt email
          </label>
          <button
            disabled={!manualPayment.userId || workingUserId === manualPayment.userId}
            onClick={() => patchUser(manualPayment.userId, { action: 'manual_payment', ...manualPayment }, 'Manual payment recorded')}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Record Payment
          </button>
        </Panel>

        <Panel title="Send Receipt">
          <AdminSelect label="User" value={receipt.userId} onChange={value => setReceipt(p => ({ ...p, userId: value }))}>
            <option value="">Select user</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
          </AdminSelect>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Amount (₹)" value={receipt.amount_rupees} onChange={value => setReceipt(p => ({ ...p, amount_rupees: value }))} />
            <NumberField label="Access days" value={receipt.days} onChange={value => setReceipt(p => ({ ...p, days: value }))} />
          </div>
          <TextField label="Receipt ID" value={receipt.receipt} onChange={value => setReceipt(p => ({ ...p, receipt: value }))} />
          <TextField label="Notes" value={receipt.notes} onChange={value => setReceipt(p => ({ ...p, notes: value }))} />
          <button
            disabled={!receipt.userId || workingUserId === receipt.userId}
            onClick={() => patchUser(receipt.userId, { action: 'send_receipt', ...receipt }, 'Receipt sent')}
            className="mt-3 rounded-lg bg-white border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
          >
            Send Receipt
          </button>
        </Panel>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">AI Credits</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-semibold text-gray-800">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                  <div className="text-xs text-gray-400 mt-1">Joined {formatDate(user.created_at)}</div>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={user.subscription_tier}
                    onChange={event => updateLocalUser(user.id, { subscription_tier: event.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  >
                    {SUBSCRIPTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <div className="text-xs text-gray-400 mt-2">{user.subscription_ends ? `Ends ${formatDate(user.subscription_ends)}` : 'No end date'}</div>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={user.account_status}
                    onChange={event => updateLocalUser(user.id, { account_status: event.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  >
                    {ACCOUNT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={user.user_role}
                    onChange={event => updateLocalUser(user.id, { user_role: event.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  >
                    {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  <div>{user.session_count} sessions</div>
                  <div>{user.attempt_count} attempts</div>
                  <div>{user.xp} XP</div>
                </td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  <div className="font-semibold text-gray-700">
                    ${toMoney(user.usage_cost_usd)} / ₹{toInr(user.usage_cost_usd)}
                  </div>
                  <div>{user.usage_call_count} calls</div>
                  <div>{Number(user.usage_total_tokens || 0).toLocaleString()} tokens</div>
                  <div className="mt-1 text-gray-400">
                    GPT ${toMoney(user.gpt_cost_usd)} · TTS ${toMoney(user.tts_cost_usd)} · STT ${toMoney(user.stt_cost_usd)}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  <div>₹{Math.round((Number(user.paid_amount_paise) || 0) / 100)}</div>
                  <div>{user.last_paid_at ? formatDate(user.last_paid_at) : 'No payment'}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={workingUserId === user.id}
                      onClick={() => patchUser(user.id, {
                        action: 'update_user',
                        subscription_tier: user.subscription_tier,
                        account_status: user.account_status,
                        user_role: user.user_role,
                      }, 'User updated')}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      disabled={workingUserId === user.id}
                      onClick={() => patchUser(user.id, { action: 'extend_trial', days: 7 }, 'Trial extended by 7 days')}
                      className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                    >
                      +7 Trial
                    </button>
                    <button
                      disabled={workingUserId === user.id}
                      onClick={() => patchUser(user.id, {
                        action: 'update_user',
                        subscription_tier: user.subscription_tier,
                        account_status: user.account_status === 'suspended' ? 'active' : 'suspended',
                        user_role: user.user_role,
                      }, user.account_status === 'suspended' ? 'User activated' : 'User suspended')}
                      className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-60"
                    >
                      {user.account_status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{note}</div>
    </section>
  )
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  )
}

function FunnelLine({ label, count, rate }: { label: string; count: string; rate: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{count}</span>
      </div>
      <div className="mt-1 text-xs text-gray-400">{rate} of total users</div>
    </div>
  )
}

function AdminSelect({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800"
      >
        {children}
      </select>
    </label>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800"
      />
    </label>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800"
      />
    </label>
  )
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

function toMoney(value: number | string) {
  return Number(value || 0).toFixed(4)
}

function toInr(value: number | string) {
  return Math.round(Number(value || 0) * 83.5)
}

function formatCount(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatDecimal(value: string | number | null | undefined) {
  return Number(value || 0).toFixed(1)
}

function formatMoney(value: string | number | null | undefined) {
  return Number(value || 0).toFixed(2)
}

function percent(numerator: string | number | null | undefined, denominator: string | number | null | undefined) {
  const base = Number(denominator || 0)
  if (!base) return '0.0%'
  return `${((Number(numerator || 0) / base) * 100).toFixed(1)}%`
}
