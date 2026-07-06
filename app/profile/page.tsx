'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

const BioCaptureModal = dynamic(() => import('@/components/bio/BioCaptureModal'), { ssr: false })

const SENIORITY_OPTIONS = ['Fresher / Intern', 'Junior (1-3 years)', 'Mid-level (3-6 years)', 'Senior (6+ years)', 'Manager / Lead', 'Director+', 'Student', 'Entrepreneur']
const INDUSTRY_OPTIONS  = ['IT / Software', 'BPO / Customer Support', 'Finance / Banking', 'Sales / Business Dev', 'Healthcare', 'Education', 'Startup', 'Manufacturing', 'Other']
const SIZE_OPTIONS      = ['Startup (< 50)', 'SME (50-500)', 'Large (500-5000)', 'MNC (5000+)']
const LANGUAGE_OPTIONS  = ['Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Other']
const TIMEZONE_OPTIONS  = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

const INTERACT_OPTIONS = [
  { id: 'international_clients', label: 'International clients (US / UK)' },
  { id: 'domestic_clients',      label: 'Domestic clients' },
  { id: 'team',                  label: 'My team / reports' },
  { id: 'leadership',            label: 'My manager / leadership' },
  { id: 'social',                label: 'Friends and social settings' },
  { id: 'recruiters',            label: 'Interviewers / recruiters' },
]
const CHALLENGE_OPTIONS = [
  { id: 'fillers',        label: 'I pause or say "um" too much' },
  { id: 'long_sentences', label: 'My sentences are too long or unclear' },
  { id: 'mti',            label: 'I mix Hindi words without realising' },
  { id: 'too_informal',   label: 'I sound too informal in professional settings' },
  { id: 'too_stiff',      label: 'I sound too stiff in casual settings' },
  { id: 'structure',      label: 'I struggle to structure my thoughts quickly' },
  { id: 'pronunciation',  label: 'My pronunciation is hard to understand' },
  { id: 'confidence',     label: 'I lose confidence when challenged' },
]
const GOAL_OPTIONS = [
  { id: 'interview',      label: 'Crack a job interview' },
  { id: 'client_calls',   label: 'Sound confident on client calls' },
  { id: 'lead_meetings',  label: 'Lead team meetings effectively' },
  { id: 'office_daily',   label: 'Improve day-to-day office communication' },
  { id: 'public_speak',   label: 'Prepare for public speaking or presentations' },
  { id: 'general',        label: 'General fluency improvement' },
]

interface ProfileForm {
  user: {
    name: string
    email: string
    subscription_tier: string
    avatar_color: string
    show_on_leaderboard: boolean
  }
  preferences: {
    timezone: string
  }
  persona: {
    native_language: string
    job_role: string
    seniority: string
    industry: string
    company_size: string
    interacts_with: string[]
    challenges: string[]
    goals: string[]
    bio_transcript: string | null
    bio_structured: Record<string, unknown> | null
    bio_recorded_at: string | null
  }
}

const EMPTY_PROFILE: ProfileForm = {
  user: {
    name: '',
    email: '',
    subscription_tier: 'free',
    avatar_color: '#6366f1',
    show_on_leaderboard: true,
  },
  preferences: {
    timezone: 'Asia/Kolkata',
  },
  persona: {
    native_language: 'Hindi',
    job_role: '',
    seniority: '',
    industry: '',
    company_size: '',
    interacts_with: [],
    challenges: [],
    goals: [],
    bio_transcript: null,
    bio_structured: null,
    bio_recorded_at: null,
  },
}

export default function ProfilePage() {
  const { update } = useSession()
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showBioModal, setShowBioModal] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load profile.')
      setProfile({
        user: {
          ...EMPTY_PROFILE.user,
          ...data.user,
        },
        preferences: {
          ...EMPTY_PROFILE.preferences,
          ...data.preferences,
        },
        persona: {
          ...EMPTY_PROFILE.persona,
          ...data.persona,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile.')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setStatus('')
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save profile.')
      await update({ user: { name: profile.user.name } })
      setStatus('Profile saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  function updateUser<K extends keyof ProfileForm['user']>(key: K, value: ProfileForm['user'][K]) {
    setProfile(prev => ({ ...prev, user: { ...prev.user, [key]: value } }))
  }

  function updatePreferences<K extends keyof ProfileForm['preferences']>(key: K, value: ProfileForm['preferences'][K]) {
    setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, [key]: value } }))
  }

  function updatePersona<K extends keyof ProfileForm['persona']>(key: K, value: ProfileForm['persona'][K]) {
    setProfile(prev => ({ ...prev, persona: { ...prev.persona, [key]: value } }))
  }

  function togglePersonaList(key: 'interacts_with' | 'challenges' | 'goals', id: string) {
    setProfile(prev => {
      const current = prev.persona[key]
      return {
        ...prev,
        persona: {
          ...prev.persona,
          [key]: current.includes(id) ? current.filter(item => item !== id) : [...current, id],
        },
      }
    })
  }

  const structuredBio = profile.persona.bio_structured
  const bioFacts = useMemo(() => {
    if (!structuredBio) return []
    return [
      ['Role', structuredBio.current_role],
      ['Seniority', structuredBio.seniority],
      ['Experience', structuredBio.years_experience ? `${structuredBio.years_experience} years` : null],
      ['Industry', structuredBio.industry],
      ['Company type', structuredBio.company_type],
      ['Team size', structuredBio.team_size],
    ].filter((item): item is [string, string] => typeof item[1] === 'string' && item[1].trim().length > 0)
  }, [structuredBio])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
        <div className="h-8 w-44 bg-gray-100 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto lg:mx-0">
      {showBioModal && (
        <BioCaptureModal
          onDone={() => {
            setShowBioModal(false)
            loadProfile()
          }}
          onClose={() => setShowBioModal(false)}
        />
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Keep your personalisation and account preferences up to date.</p>
        </div>
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {(status || error) && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {error || status}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 space-y-5">
          <Panel title="Account">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Display name" value={profile.user.name} onChange={value => updateUser('name', value)} />
              <ReadOnlyField label="Email" value={profile.user.email} />
              <ReadOnlyField label="Plan" value={profile.user.subscription_tier} />
              <ColorField label="Avatar color" value={profile.user.avatar_color} onChange={value => updateUser('avatar_color', value)} />
            </div>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-gray-700">Show me on leaderboard</span>
                <span className="block text-xs text-gray-400 mt-0.5">You can hide your profile from public ranking lists.</span>
              </span>
              <input
                type="checkbox"
                checked={profile.user.show_on_leaderboard}
                onChange={e => updateUser('show_on_leaderboard', e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </Panel>

          <Panel title="Personalisation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Mother tongue"
                value={profile.persona.native_language}
                options={LANGUAGE_OPTIONS}
                onChange={value => updatePersona('native_language', value)}
              />
              <SelectField
                label="Timezone"
                value={profile.preferences.timezone}
                options={TIMEZONE_OPTIONS}
                onChange={value => updatePreferences('timezone', value)}
              />
              <TextField label="Job role" value={profile.persona.job_role} onChange={value => updatePersona('job_role', value)} />
              <SelectField label="Seniority" value={profile.persona.seniority} options={SENIORITY_OPTIONS} onChange={value => updatePersona('seniority', value)} />
              <SelectField label="Industry" value={profile.persona.industry} options={INDUSTRY_OPTIONS} onChange={value => updatePersona('industry', value)} />
              <SelectField label="Company size" value={profile.persona.company_size} options={SIZE_OPTIONS} onChange={value => updatePersona('company_size', value)} />
            </div>
          </Panel>

          <Panel title="Communication Context">
            <OptionGroup
              label="Who do you speak English with?"
              options={INTERACT_OPTIONS}
              selected={profile.persona.interacts_with}
              onToggle={id => togglePersonaList('interacts_with', id)}
            />
            <OptionGroup
              label="Current challenges"
              options={CHALLENGE_OPTIONS}
              selected={profile.persona.challenges}
              onToggle={id => togglePersonaList('challenges', id)}
            />
            <OptionGroup
              label="Practice goals"
              options={GOAL_OPTIONS}
              selected={profile.persona.goals}
              onToggle={id => togglePersonaList('goals', id)}
            />
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="Voice Bio">
            {structuredBio ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Summary</div>
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed">{String(structuredBio.summary ?? 'No summary captured yet.')}</p>
                </div>
                {bioFacts.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {bioFacts.map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-400">{label}</div>
                        <div className="text-sm font-medium text-gray-700">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {profile.persona.bio_recorded_at && (
                  <p className="text-xs text-gray-400">Recorded {formatDate(profile.persona.bio_recorded_at)}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No voice bio has been recorded yet.</p>
            )}
            <button
              type="button"
              onClick={() => setShowBioModal(true)}
              className="mt-4 w-full rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              {structuredBio ? 'Update voice bio' : 'Record voice bio'}
            </button>
          </Panel>

          <Panel title="Captured Transcript">
            {profile.persona.bio_transcript ? (
              <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {profile.persona.bio_transcript}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Your spoken profile transcript will appear here after recording.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        readOnly
        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
      />
    </label>
  )
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option value="">Not set</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-gray-200 bg-white p-1"
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
    </label>
  )
}

function OptionGroup({
  label, options, selected, onToggle,
}: {
  label: string
  options: Array<{ id: string; label: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-sm font-medium text-gray-700">{label}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(option => {
          const checked = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition ${
                checked
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              <span className="font-semibold">{checked ? '✓ ' : ''}</span>{option.label}
            </button>
          )
        })}
      </div>
    </div>
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
