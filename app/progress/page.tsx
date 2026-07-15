'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  attempts: Attempt[]
  monthlyXp: Array<{ month_year: string; xp: number }>
}

interface Attempt {
    id: string; session_id: string; created_at: string; scenario_title: string | null; scenario_category: string | null
    transcript: string | null; feedback_text: string | null; model_response: string | null; tts_audio_path: string | null
    duration_sec: number | null; score_overall: number; score_clarity: number; score_fluency: number
    score_vocabulary: number; score_structure: number; score_confidence: number; score_tone: number
    filler_word_count: number; words_per_minute: number; xp_earned: number
    evaluation_json?: {
      what_worked?: string
      improvement_focus?: string
      model_response?: string
      dimension_evidence?: Record<string, { score: number; verdict: string; evidence: string[]; impact: string; fix: string }>
      voice_summary?: { strengths: string; priority_fix: string; next_practice: string }
    } | null
}

const DIM_LABELS: Record<string, string> = {
  clarity: 'Clarity', fluency: 'Fluency', vocabulary: 'Vocabulary',
  structure: 'Structure', confidence: 'Confidence', tone_match: 'Tone',
}
type ProgressStatus = 'improving' | 'stable' | 'declining' | 'insufficient'

const PROGRESS_STYLES: Record<ProgressStatus, { bar: string; line: string; badge: string; label: string }> = {
  improving: { bar: 'bg-green-500', line: '#22c55e', badge: 'bg-green-100 text-green-700', label: 'Improving' },
  stable: { bar: 'bg-amber-400', line: '#f59e0b', badge: 'bg-amber-100 text-amber-700', label: 'No clear improvement' },
  declining: { bar: 'bg-red-500', line: '#ef4444', badge: 'bg-red-100 text-red-700', label: 'Declining' },
  insufficient: { bar: 'bg-gray-400', line: '#9ca3af', badge: 'bg-gray-100 text-gray-600', label: 'Need more sessions' },
}
const DIM_SCORE_KEYS: Record<string, keyof Attempt> = {
  clarity: 'score_clarity',
  fluency: 'score_fluency',
  vocabulary: 'score_vocabulary',
  structure: 'score_structure',
  confidence: 'score_confidence',
  tone_match: 'score_tone',
}
const IST_TIME_ZONE = 'Asia/Kolkata'
const recentSessionDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: IST_TIME_ZONE,
})
const sessionDetailDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: IST_TIME_ZONE,
  timeZoneName: 'short',
})

function formatRecentSessionTime(value: string) {
  return `${recentSessionDateFormatter.format(new Date(value))} IST`
}

function formatSessionDetailTime(value: string) {
  return sessionDetailDateFormatter.format(new Date(value))
}

function formatScore(value: number | string | null | undefined) {
  const score = Number(value ?? 0)
  return Number.isFinite(score) ? score.toFixed(2) : '0.00'
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function getDimensionProgress(attempts: Attempt[], dimension: string) {
  const scoreKey = DIM_SCORE_KEYS[dimension]
  const newestFirst = attempts.map(attempt => Number(attempt[scoreKey] ?? 0))
  const recent = newestFirst.slice(0, 3)
  const previous = newestFirst.slice(3, 6)

  if (newestFirst.length < 2) {
    return { status: 'insufficient' as ProgressStatus, change: 0, scores: newestFirst.slice().reverse() }
  }

  // Compare short rolling windows so one unusually good or bad session does not
  // incorrectly define the user's progress.
  const change = previous.length
    ? average(recent) - average(previous)
    : newestFirst[0] - newestFirst[1]
  const status: ProgressStatus = change >= 0.15 ? 'improving' : change <= -0.15 ? 'declining' : 'stable'
  return { status, change, scores: newestFirst.slice(0, 6).reverse() }
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>
  )
}

export default function ProgressPage() {
  const [data, setData]     = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [selectedDimension, setSelectedDimension] = useState('clarity')
  const [planStates, setPlanStates] = useState<Record<string, { loading?: boolean; guideId?: string; error?: string }>>({})

  useEffect(() => {
    fetch('/api/progress').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
  if (!data)   return null

  const xpPct = data.user.nextLevel
    ? Math.round(((data.user.xp - data.user.level.xpRequired) / (data.user.nextLevel.xpRequired - data.user.level.xpRequired)) * 100)
    : 100

  const avgOverall = data.attempts.length
    ? data.attempts.reduce((s, a) => s + a.score_overall, 0) / data.attempts.length
    : 0

  const worstDim = Object.entries(data.dimensionAvg).sort((a, b) => a[1] - b[1])[0]
  const dimensionTrend = data.attempts
    .slice()
    .reverse()
    .map((attempt, index) => ({
      session: index + 1,
      score: Number(attempt[DIM_SCORE_KEYS[selectedDimension]] ?? 0),
      date: formatRecentSessionTime(attempt.created_at),
      scenario: attempt.scenario_title ?? 'Practice session',
    }))
  const selectedProgress = getDimensionProgress(data.attempts, selectedDimension)

  function askAI(dimension: string, avg: number) {
    const progress = getDimensionProgress(data!.attempts, dimension)
    const label = DIM_LABELS[dimension]
    const trendDescription = progress.status === 'insufficient'
      ? 'There is not enough history to establish a trend yet.'
      : `The recent trend is ${PROGRESS_STYLES[progress.status].label.toLowerCase()} (${progress.change >= 0 ? '+' : ''}${formatScore(progress.change)}).`
    const prompt = `Help me improve my ${label}. My Progress page shows an average of ${formatScore(avg)}/5. ${trendDescription} My recent ${label.toLowerCase()} scores, from oldest to newest, are ${progress.scores.map(formatScore).join(', ')}. Explain what may be holding me back and give me specific, practical exercises and an example suited to my work profile.`

    window.dispatchEvent(new CustomEvent('auraxpress:ask-coach', { detail: { prompt } }))
  }

  async function createPlan(dimension: string, avg: number) {
    const progress = getDimensionProgress(data!.attempts, dimension)
    const label = DIM_LABELS[dimension]
    setPlanStates(current => ({ ...current, [dimension]: { loading: true } }))

    try {
      const response = await fetch('/api/study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_mode: true,
          dimension: label,
          topic: `${label} improvement plan`,
          verdict: `${PROGRESS_STYLES[progress.status].label}; current average ${formatScore(avg)}/5`,
          performance_context: {
            average: formatScore(avg),
            trend: progress.status,
            change: formatScore(progress.change),
            recent_scores: progress.scores.map(formatScore),
          },
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not create the plan.')
      setPlanStates(current => ({ ...current, [dimension]: { guideId: result.savedGuide?.id } }))
    } catch (error) {
      setPlanStates(current => ({
        ...current,
        [dimension]: { error: error instanceof Error ? error.message : 'Could not create the plan.' },
      }))
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto lg:mx-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Progress</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Level',         value: `${data.user.level.level} — ${data.user.level.title}`, sub: `${data.user.xp} XP total` },
          { label: 'Sessions',      value: data.totalSessions,  sub: 'All time' },
          { label: 'Avg score',     value: `${formatScore(avgOverall)}/100`, sub: 'Last 20 sessions' },
          { label: 'Streak',        value: `${data.user.streak_days}d 🔥`, sub: 'Current streak' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-indigo-700">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">Score by Dimension</h2>
              <p className="mt-1 text-xs text-gray-400">Colors show progress over time, not the type of skill.</p>
            </div>
            <p className="text-xs text-gray-400">Click a dimension to view its trend</p>
          </div>
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-500">
            {(['improving', 'stable', 'declining', 'insufficient'] as ProgressStatus[]).map(status => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${PROGRESS_STYLES[status].bar}`} />
                {PROGRESS_STYLES[status].label}
              </span>
            ))}
          </div>
          <div className="space-y-4">
            {Object.entries(data.dimensionAvg).map(([dim, avg]) => {
              const progress = getDimensionProgress(data.attempts, dim)
              const style = PROGRESS_STYLES[progress.status]
              const needsAction = avg < 3.5
                || (avg < 4.75 && (progress.status === 'stable' || progress.status === 'declining'))
              const planState = planStates[dim]

              return (
                <div
                  key={dim}
                  className={`rounded-xl p-3 transition ${
                    selectedDimension === dim ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedDimension(dim)} className="block w-full text-left">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`font-semibold ${selectedDimension === dim ? 'text-indigo-700' : 'text-gray-600'}`}>{DIM_LABELS[dim]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>{style.label}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-gray-700">{formatScore(avg)}/5</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100">
                      <div className={`h-2.5 rounded-full ${style.bar} transition-all duration-700`} style={{ width: `${(avg / 5) * 100}%` }} />
                    </div>
                  </button>

                  {needsAction && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => askAI(dim, avg)}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        Ask AI
                      </button>
                      {planState?.guideId ? (
                        <Link href={`/learning-guides?guide=${planState.guideId}`} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                          View Plan
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => createPlan(dim, avg)}
                          disabled={planState?.loading}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {planState?.loading ? 'Creating…' : 'Create Plan'}
                        </button>
                      )}
                      {planState?.error && <span className="text-xs text-red-500">{planState.error}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <DimensionTrendChart
            label={DIM_LABELS[selectedDimension]}
            color={PROGRESS_STYLES[selectedProgress.status].line}
            data={dimensionTrend}
          />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Scenario Mastery</h2>
          <div className="space-y-3">
            {data.scenarioMastery.map(s => (
              <div key={s.title} className="flex items-center justify-between py-1">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 font-medium truncate">{s.title}</div>
                  <div className="text-xs text-gray-400">{s.attempt_count} attempts · Best {formatScore(s.best_score)}/100</div>
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
                {['Date', 'Scenario', 'Score', 'Clarity', 'Fluency', 'Vocab', 'Structure', 'Confidence', 'Tone', 'Fillers', 'WPM', 'XP', ''].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.attempts.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap text-xs">{formatRecentSessionTime(a.created_at)}</td>
                  <td className="py-2 pr-4 min-w-48">
                    <div className="text-gray-700 font-medium truncate">{a.scenario_title ?? 'Practice session'}</div>
                    <div className="text-xs text-gray-400 truncate">{a.scenario_category ?? 'Scenario'}</div>
                  </td>
                  <td className="py-2 pr-4"><span className={`font-bold ${a.score_overall >= 70 ? 'text-green-600' : a.score_overall >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{formatScore(a.score_overall)}</span></td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_clarity)}</td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_fluency)}</td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_vocabulary)}</td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_structure)}</td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_confidence)}</td>
                  <td className="py-2 pr-4 text-gray-600">{formatScore(a.score_tone)}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.filler_word_count}</td>
                  <td className="py-2 pr-4 text-gray-600">{Math.round(a.words_per_minute)}</td>
                  <td className="py-2 text-indigo-600 font-medium">+{a.xp_earned}</td>
                  <td className="py-2">
                    <button
                      onClick={() => setSelectedAttempt(a)}
                      className="rounded-lg border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.attempts.length === 0 && <p className="text-xs text-gray-400 py-4">No sessions yet. Start practicing!</p>}
        </div>
      </div>

      {selectedAttempt && (
        <SessionDetail attempt={selectedAttempt} onClose={() => setSelectedAttempt(null)} />
      )}
    </div>
  )
}

function DimensionTrendChart({
  label, color, data,
}: {
  label: string
  color: string
  data: Array<{ session: number; score: number; date: string; scenario: string }>
}) {
  if (data.length < 2) {
    return (
      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="text-sm font-semibold text-gray-800">{label} trend</div>
        <p className="mt-1 text-xs text-gray-400">Complete at least two sessions to see progress over time.</p>
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-800">{label} trend</div>
          <div className="text-xs text-gray-400">Oldest to newest, last {data.length} sessions</div>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Latest: <span className="text-gray-800">{formatScore(data[data.length - 1]?.score)}/5</span>
        </div>
      </div>
      <div className="h-56">
        <DimensionSvgChart data={data} color={color} />
      </div>
    </div>
  )
}

function DimensionSvgChart({
  data,
  color,
}: {
  data: Array<{ session: number; score: number; date: string; scenario: string }>
  color: string
}) {
  const width = 640
  const height = 220
  const padX = 34
  const padY = 18
  const chartWidth = width - padX * 2
  const chartHeight = height - padY * 2
  const xFor = (index: number) => padX + (data.length === 1 ? chartWidth : (index / (data.length - 1)) * chartWidth)
  const yFor = (score: number) => padY + chartHeight - (Math.max(0, Math.min(5, score)) / 5) * chartHeight
  const points = data.map((point, index) => `${xFor(index)},${yFor(point.score)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Dimension score trend line chart">
      {[0, 1, 2, 3, 4, 5].map(score => (
        <g key={score}>
          <line
            x1={padX}
            x2={width - padX}
            y1={yFor(score)}
            y2={yFor(score)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <text x="8" y={yFor(score) + 4} className="fill-gray-400 text-[11px]">{score}</text>
        </g>
      ))}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((point, index) => (
        <g key={`${point.session}-${point.date}`}>
          <circle cx={xFor(index)} cy={yFor(point.score)} r="5" fill="#fff" stroke={color} strokeWidth="3">
            <title>{`Session ${point.session}: ${formatScore(point.score)}/5 - ${point.scenario} - ${point.date}`}</title>
          </circle>
          {(index === 0 || index === data.length - 1) && (
            <text
              x={xFor(index)}
              y={height - 4}
              textAnchor={index === 0 ? 'start' : 'end'}
              className="fill-gray-400 text-[11px]"
            >
              S{point.session}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function SessionDetail({ attempt, onClose }: { attempt: Attempt; onClose: () => void }) {
  const evaluation = attempt.evaluation_json
  const evidence = evaluation?.dimension_evidence
  const scores = [
    ['Clarity', attempt.score_clarity],
    ['Fluency', attempt.score_fluency],
    ['Vocabulary', attempt.score_vocabulary],
    ['Structure', attempt.score_structure],
    ['Confidence', attempt.score_confidence],
    ['Tone', attempt.score_tone],
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/30 px-4 py-6 overflow-y-auto">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 rounded-t-2xl px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800">{attempt.scenario_title ?? 'Practice session'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatSessionDetailTime(attempt.created_at)} · {attempt.scenario_category ?? 'Scenario'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition">Close</button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Overall" value={`${formatScore(attempt.score_overall)}/100`} />
            <Metric label="WPM" value={Math.round(attempt.words_per_minute)} />
            <Metric label="Fillers" value={attempt.filler_word_count} />
            <Metric label="XP" value={`+${attempt.xp_earned}`} />
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Scores</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {scores.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="font-semibold text-indigo-700">{formatScore(Number(value))}/5</div>
                </div>
              ))}
            </div>
          </div>

          {(evaluation?.what_worked || attempt.feedback_text) && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <div className="text-xs font-semibold text-green-700 mb-1">What worked</div>
              <p className="text-sm text-gray-700">{evaluation?.what_worked ?? attempt.feedback_text}</p>
            </div>
          )}

          {(evaluation?.improvement_focus || attempt.feedback_text) && (
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
              <div className="text-xs font-semibold text-orange-700 mb-1">Priority fix</div>
              <p className="text-sm text-gray-700">{evaluation?.improvement_focus ?? attempt.feedback_text}</p>
            </div>
          )}

          {evidence && (
            <div className="rounded-xl border border-gray-100 p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Evidence</h4>
              <div className="space-y-3">
                {Object.entries(evidence).map(([key, item]) => (
                  <div key={key} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex justify-between gap-3 mb-1">
                      <div className="text-sm font-semibold text-gray-800">{DIM_LABELS[key] ?? key}</div>
                      <div className="text-xs font-bold text-indigo-700">{formatScore(item.score)}/5</div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{item.verdict}</p>
                    {!!item.evidence?.length && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.evidence.map(quote => (
                          <span key={quote} className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">&quot;{quote}&quot;</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-700"><strong>Impact:</strong> {item.impact}</p>
                    <p className="text-xs text-gray-700 mt-1"><strong>Fix:</strong> {item.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-100 p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Polished response</h4>
            <p className="text-sm text-gray-700 leading-relaxed italic">{evaluation?.model_response ?? attempt.model_response ?? 'Not available for this older session.'}</p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Transcript</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{attempt.transcript ?? 'Transcript not available.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-indigo-50 p-3">
      <div className="text-xs text-indigo-400">{label}</div>
      <div className="text-lg font-bold text-indigo-700">{value}</div>
    </div>
  )
}
