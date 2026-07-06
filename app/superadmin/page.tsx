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
}

const SUBSCRIPTION_TYPES = ['free', 'pro_trial', 'pro']
const ACCOUNT_STATUSES = ['active', 'suspended']
const USER_ROLES = ['user', 'superadmin']

export default function SuperadminPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingUserId, setWorkingUserId] = useState('')
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

  const loadUsers = useCallback(async (nextSearch = '') => {
    setLoading(true)
    setError('')
    try {
      const qs = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : ''
      const res = await fetch(`/api/superadmin/users${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load users.')
      setUsers(data.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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
      setMessage(success)
      await loadUsers(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
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

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
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
