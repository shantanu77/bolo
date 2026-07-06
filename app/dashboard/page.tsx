'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Progress {
  user: { xp: number; level: { title: string; level: number }; nextLevel: { xpRequired: number } | null; streak_days: number }
  totalSessions: number
  dimensionAvg: Record<string, number>
  badges: Array<{ badge_slug: string; name: string; icon: string; earned_at: string }>
  attempts: Array<{ score_overall: number; created_at: string }>
}

interface BioStructured {
  summary?: string
  current_role?: string
  seniority?: string
  evaluation_lens?: string
}

interface UserCategory {
  id: string
  source: string
}
interface BillingStatus {
  subscription_tier: string
  subscription_ends: string | null
  isActive: boolean
  isTrial: boolean
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [bio, setBio]           = useState<{ transcript: string; structured: BioStructured } | null | undefined>(undefined)
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    fetch('/api/progress').then(r => r.json()).then(d => setProgress(d))
    fetch('/api/bio').then(r => r.json()).then(d => setBio(d.bio ?? null))
    fetch('/api/generate/categories').then(r => r.json()).then(d => setCategories(d.categories ?? [])).catch(() => null)
    fetch('/api/billing/status').then(r => r.json()).then(d => setBilling(d)).catch(() => null)
  }, [])

  const recentScore = progress?.attempts?.[0]?.score_overall
  const prevScore   = progress?.attempts?.[1]?.score_overall
  const delta       = recentScore && prevScore ? recentScore - prevScore : null
  const hasCustomCategory = categories.some(cat => cat.source === 'user_requested')
  const showSetupGuide = bio === null || !hasCustomCategory

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto lg:mx-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Good {getTimeOfDay()}, {session?.user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Ready to practice today?</p>
      </div>

      {showSetupGuide && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">Start here</div>
              <h2 className="text-lg font-bold text-gray-800">Build your personal practice system</h2>
              <p className="text-sm text-gray-500 mt-1">
                AuraXpress becomes much more useful when it knows your role and the exact situations you want to practice.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[28rem]">
              <SetupStep
                done={bio !== null && bio !== undefined}
                title="Record voice bio"
                text="Tell us about your work, responsibilities, and communication challenges."
                href="/profile"
                cta={bio ? 'Review profile' : 'Record now'}
              />
              <SetupStep
                done={hasCustomCategory}
                title="Create custom category"
                text="Describe one real situation and generate practice scenarios for it."
                href="/practice?create=1"
                cta={hasCustomCategory ? 'Create another' : 'Create category'}
              />
            </div>
          </div>
        </div>
      )}

      {billing && !billing.isActive && (
        <div className="bg-white border border-orange-100 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-1">
              {billing.isTrial ? 'Trial finished' : 'Upgrade available'}
            </div>
            <h2 className="text-lg font-bold text-gray-800">Continue with AuraXpress Pro</h2>
            <p className="text-sm text-gray-500 mt-1">
              Keep unlimited practice, personalised categories, custom category creation, and full analytics active.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Pay ₹499
          </Link>
        </div>
      )}

      {/* Bio CTA — show if bio not yet recorded */}
      {bio === null && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-6 text-white flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="text-4xl shrink-0">🎤</div>
          <div className="flex-1">
            <div className="font-bold text-lg">Tell AuraXpress about yourself</div>
            <p className="text-indigo-100 text-sm mt-0.5">
              Speak for 60 seconds about your role, responsibilities, and communication challenges.
              AuraXpress uses this to tailor every scenario and evaluation specifically to you.
            </p>
          </div>
          <Link href="/profile"
            className="shrink-0 px-5 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl hover:bg-indigo-50 transition">
            Record now
          </Link>
        </div>
      )}

      {/* Bio summary strip — show if bio exists */}
      {bio?.structured && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg shrink-0">
            {session?.user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800">
              {bio.structured.current_role ?? 'Your profile'}
              {bio.structured.seniority ? ` · ${bio.structured.seniority}` : ''}
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{bio.structured.summary}</p>
          </div>
          <Link href="/profile"
            className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 transition px-3 py-1.5 border border-indigo-100 rounded-lg">
            Update
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Streak',         value: progress ? `${progress.user.streak_days}d 🔥` : '–',  sub: 'Keep it going' },
          { label: 'Total sessions', value: progress?.totalSessions ?? '–',                         sub: 'All time' },
          { label: 'Overall score',  value: recentScore ? `${recentScore}/100` : '–',               sub: delta != null ? (delta >= 0 ? `+${delta} from last` : `${delta} from last`) : 'Your latest' },
          { label: 'XP total',       value: progress ? `${progress.user.xp}` : '–',                sub: progress?.user.level.title ?? '' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-indigo-700">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Quick Practice</h2>
            <Link href="/practice" className="text-xs text-indigo-500 hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {[
              { href: '/practice', label: 'My personalised scenarios', icon: '⭐', desc: 'AI-generated for your role and goals' },
              { href: '/practice?cat=professional_daily', label: 'Professional Day-to-Day', icon: '💼', desc: 'Standups, updates, daily communication' },
              { href: '/practice?cat=client_call',        label: 'Client Calls',            icon: '📞', desc: 'US/UK client calls, pushback, complaints' },
              { href: '/practice?cat=interview',          label: 'Interview Prep',           icon: '🎯', desc: 'Tell me about yourself, tough questions' },
            ].map(c => (
              <Link key={c.href} href={c.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition group">
                <span className="text-2xl">{c.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 group-hover:text-indigo-700 text-sm">{c.label}</div>
                  <div className="text-xs text-gray-400">{c.desc}</div>
                </div>
                <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-indigo-600 rounded-2xl p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200 mb-2">Daily Challenge</div>
            <div className="font-semibold text-sm mb-3">Opening a Call with a US Client</div>
            <div className="text-indigo-200 text-xs mb-4">+15 XP · Same scenario for all users today</div>
            <Link href={`/practice/sc-004`}
              className="block text-center py-2 bg-white text-indigo-700 font-semibold rounded-lg text-sm hover:bg-indigo-50 transition">
              Start Challenge
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-sm font-semibold text-gray-700 mb-3">Recent badges</div>
            {progress?.badges?.length ? (
              <div className="flex flex-wrap gap-2">
                {progress.badges.slice(0, 6).map(b => (
                  <span key={b.badge_slug} title={b.name} className="text-xl">{b.icon}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Complete sessions to earn badges</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SetupStep({
  done, title, text, href, cta,
}: {
  done: boolean
  title: string
  text: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition ${
        done
          ? 'border-green-100 bg-green-50 hover:border-green-200'
          : 'border-indigo-100 bg-indigo-50 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`text-xs font-semibold uppercase tracking-wide ${done ? 'text-green-600' : 'text-indigo-600'}`}>
          {done ? 'Done' : 'Recommended'}
        </div>
        <span className={`text-sm font-bold ${done ? 'text-green-600' : 'text-indigo-600'}`}>{done ? '✓' : '→'}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-800">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p>
      <div className={`mt-3 text-xs font-semibold ${done ? 'text-green-700' : 'text-indigo-700'}`}>{cta}</div>
    </Link>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
