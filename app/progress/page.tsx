'use client'
import { useEffect, useState } from 'react'

interface ProgressData {
  user: {
    xp: number
    level: { level: number; title: string; xpRequired: number }
    nextLevel: { level: number; title: string; xpRequired: number } | null
    streak_days: number
  }
  totalSessions: number
  dimensionAvg: Record<string, number>
  badges: Array<{ badge_slug: string; name: string; icon: string; description: string; earned_at: string }>
  scenarioMastery: Array<{ title: string; category: string; mastery_stars: number; best_score: number; attempt_count: number }>
  attempts: Array<{
    created_at: string; score_overall: number; score_clarity: number; score_fluency: number
    score_vocabulary: number; score_structure: number; score_confidence: number; score_tone: number
    filler_word_count: number; words_per_minute: number; xp_earned: number
  }>
  monthlyXp: Array<{ month_year: string; xp: number }>
}

const DIM_LABELS: Record<string, string> = {
  clarity: 'Clarity', fluency: 'Fluency', vocabulary: 'Vocabulary',
  structure: 'Structure', confidence: 'Confidence', tone_match: 'Tone',
}
const DIM_COLORS: Record<string, string> = {
  clarity: 'bg-blue-500', fluency: 'bg-green-500', vocabulary: 'bg-purple-500',
  structure: 'bg-yellow-500', confidence: 'bg-red-400', tone_match: 'bg-indigo-500',
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>
  )
}

export default function ProgressPage() {
  const [data, setData]     = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
  if (!data)   return null

  const xpPct = data.user.nextLevel
    ? Math.round(((data.user.xp - data.user.level.xpRequired) / (data.user.nextLevel.xpRequired - data.user.level.xpRequired)) * 100)
    : 100

  const avgOverall = data.attempts.length
    ? Math.round(data.attempts.reduce((s, a) => s + a.score_overall, 0) / data.attempts.length)
    : 0

  const worstDim = Object.entries(data.dimensionAvg).sort((a, b) => a[1] - b[1])[0]

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Progress</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Level',         value: `${data.user.level.level} — ${data.user.level.title}`, sub: `${data.user.xp} XP total` },
          { label: 'Sessions',      value: data.totalSessions,  sub: 'All time' },
          { label: 'Avg score',     value: `${avgOverall}/100`, sub: 'Last 20 sessions' },
          { label: 'Streak',        value: `${data.user.streak_days}d 🔥`, sub: 'Current streak' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-indigo-700">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-5">Score by Dimension</h2>
          <div className="space-y-4">
            {Object.entries(data.dimensionAvg).map(([dim, avg]) => (
              <div key={dim}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{DIM_LABELS[dim]}</span>
                  <span className="font-semibold text-gray-700">{avg}/5</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full">
                  <div className={`h-2.5 rounded-full ${DIM_COLORS[dim]} transition-all duration-700`} style={{ width: `${(avg / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {worstDim && (
            <div className="mt-5 bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
              <strong>Focus area:</strong> {DIM_LABELS[worstDim[0]]} is your lowest average — try scenarios with &quot;{worstDim[0]}&quot; as the communication goal.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">XP Progress</h2>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-indigo-700">{data.user.xp}</div>
            <div className="text-xs text-gray-400 mt-1">Total XP</div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mb-1">
            <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Lv.{data.user.level.level}</span>
            {data.user.nextLevel && <span>Lv.{data.user.nextLevel.level}: {data.user.nextLevel.xpRequired} XP</span>}
          </div>
          <div className="mt-4 space-y-2">
            {data.monthlyXp.map(m => (
              <div key={m.month_year} className="flex justify-between text-xs">
                <span className="text-gray-500">{m.month_year}</span>
                <span className="font-semibold text-indigo-600">{m.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Scenario Mastery</h2>
          <div className="space-y-3">
            {data.scenarioMastery.map(s => (
              <div key={s.title} className="flex items-center justify-between py-1">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 font-medium truncate">{s.title}</div>
                  <div className="text-xs text-gray-400">{s.attempt_count} attempts · Best {s.best_score}/100</div>
                </div>
                <Stars count={s.mastery_stars} />
              </div>
            ))}
            {data.scenarioMastery.length === 0 && (
              <p className="text-xs text-gray-400">No scenarios practiced yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Badges Earned ({data.badges.length})</h2>
          {data.badges.length === 0 ? (
            <p className="text-xs text-gray-400">Complete sessions to earn badges</p>
          ) : (
            <div className="space-y-3">
              {data.badges.map(b => (
                <div key={b.badge_slug} className="flex items-center gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{b.name}</div>
                    <div className="text-xs text-gray-400">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Recent Sessions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Score', 'Clarity', 'Fluency', 'Vocab', 'Structure', 'Confidence', 'Tone', 'Fillers', 'WPM', 'XP'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.attempts.map((a, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap text-xs">{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className="py-2 pr-4"><span className={`font-bold ${a.score_overall >= 70 ? 'text-green-600' : a.score_overall >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{a.score_overall}</span></td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_clarity}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_fluency}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_vocabulary}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_structure}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_confidence}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.score_tone}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.filler_word_count}</td>
                  <td className="py-2 pr-4 text-gray-600">{Math.round(a.words_per_minute)}</td>
                  <td className="py-2 text-indigo-600 font-medium">+{a.xp_earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.attempts.length === 0 && <p className="text-xs text-gray-400 py-4">No sessions yet. Start practicing!</p>}
        </div>
      </div>
    </div>
  )
}
