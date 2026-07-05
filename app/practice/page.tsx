'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface UserCategory {
  id: string
  name: string
  description: string
  icon: string
  source: string
  scenario_count: number
}
interface Scenario {
  id: string
  title: string
  context: string
  question: string
  register: string
  comm_goal: string
  mastery_stars?: number
  best_score?: number | null
  attempt_count?: number
  is_today_daily?: boolean
  category?: string
}
interface GeneratingState { phase: 'idle' | 'recording' | 'processing' | 'done' | 'error'; error?: string; transcript?: string; newCatName?: string }

const GLOBAL_CATEGORIES = [
  { id: 'professional_daily', label: 'Professional Day-to-Day', icon: '💼', desc: 'Standups, updates, daily communication' },
  { id: 'client_call',        label: 'Client Calls',            icon: '📞', desc: 'US/UK client calls, pushback, complaints' },
  { id: 'interview',          label: 'Interview Prep',          icon: '🎯', desc: 'Tell me about yourself, tough questions' },
  { id: 'social',             label: 'Social & Networking',     icon: '🤝', desc: 'Small talk, introductions, office events' },
]

function Stars({ count }: { count: number }) {
  return <span className="text-yellow-400 text-sm">{'★'.repeat(count || 0)}{'☆'.repeat(5 - (count || 0))}</span>
}

function ScenarioCard({ s, scenarioType }: { s: Scenario; scenarioType: 'global' | 'user' }) {
  return (
    <Link href={`/practice/${s.id}?type=${scenarioType}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition group">
      <div className="flex justify-between items-start mb-1.5">
        <div className="font-semibold text-gray-800 group-hover:text-indigo-700 text-sm leading-tight pr-2">{s.title}</div>
        {s.is_today_daily && <span className="shrink-0 text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">Daily +15XP</span>}
      </div>
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{s.context}</p>
      <div className="flex items-center justify-between">
        <Stars count={s.mastery_stars ?? 0} />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {s.best_score != null && <span>Best: <strong className="text-gray-600">{s.best_score}/100</strong></span>}
          {(s.attempt_count ?? 0) > 0 && <span>{s.attempt_count}×</span>}
        </div>
      </div>
    </Link>
  )
}

function PracticeContent() {
  const [userCats, setUserCats]         = useState<UserCategory[]>([])
  const [activeCat, setActiveCat]       = useState<string | null>(null)
  const [activeCatType, setActiveCatType] = useState<'user' | 'global'>('user')
  const [scenarios, setScenarios]       = useState<Scenario[]>([])
  const [loadingCats, setLoadingCats]   = useState(true)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [generating, setGenerating]     = useState<GeneratingState>({ phase: 'idle' })
  const [showVoicePrompt, setShowVoicePrompt] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [scenarioError, setScenarioError] = useState('')

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<NodeJS.Timeout | null>(null)
  const [recSec, setRecSec] = useState(0)

  // Load user categories; auto-generate if none yet
  useEffect(() => {
    fetchJson('/api/generate/categories', { method: 'GET' })
      .then(async d => {
        if (!d.categories?.length) {
          // First time: generate
          const gen = await fetchJson('/api/generate/categories', { method: 'POST' })
          setUserCats(gen.categories ?? [])
        } else {
          setUserCats(d.categories)
        }
        setLoadingCats(false)
      })
      .catch(err => {
        setCategoryError(err instanceof Error ? err.message : 'Could not load practice categories.')
        setLoadingCats(false)
      })
  }, [])

  async function loadScenarios(catId: string, type: 'user' | 'global') {
    setActiveCat(catId)
    setActiveCatType(type)
    setLoadingScenarios(true)
    setScenarios([])
    setScenarioError('')

    const url = type === 'user'
      ? `/api/user-scenarios?category_id=${catId}`
      : `/api/scenarios?category=${catId}`
    try {
      const data = await fetchJson(url)
      setScenarios(data.scenarios ?? [])
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : 'Could not load scenarios.')
    } finally {
      setLoadingScenarios(false)
    }
  }

  // Voice: record new category request
  async function startVoiceRequest() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(250)
      mediaRef.current = recorder
      setRecSec(0)
      timerRef.current = setInterval(() => setRecSec(s => s + 1), 1000)
      setGenerating({ phase: 'recording' })
    } catch {
      setGenerating({ phase: 'error', error: 'Microphone access denied.' })
    }
  }

  async function stopVoiceAndGenerate() {
    if (!mediaRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setGenerating({ phase: 'processing' })

    const recorder = mediaRef.current
    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())
    await new Promise<void>(resolve => { recorder.onstop = () => resolve() })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const res  = await fetch('/api/generate/scenarios', { method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' } })
    const data = await res.json()

    if (!res.ok) {
      setGenerating({ phase: 'error', error: data.error ?? 'Failed to generate. Please try again.' })
      return
    }

    setUserCats(prev => [...prev, { id: data.category.id, ...data.category, source: 'user_requested', scenario_count: data.scenarios?.length ?? 0 }])
    setGenerating({ phase: 'done', transcript: data.userRequest, newCatName: data.category.name })
    setShowVoicePrompt(false)
  }

  async function submitTextRequest(text: string) {
    setGenerating({ phase: 'processing' })
    const res  = await fetch('/api/generate/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: text }),
    })
    const data = await res.json()
    if (!res.ok) { setGenerating({ phase: 'error', error: data.error ?? 'Failed.' }); return }
    setUserCats(prev => [...prev, { id: data.category.id, ...data.category, source: 'user_requested', scenario_count: data.scenarios?.length ?? 0 }])
    setGenerating({ phase: 'done', newCatName: data.category.name })
    setShowVoicePrompt(false)
  }

  const activeCatObj = userCats.find(c => c.id === activeCat) ??
    GLOBAL_CATEGORIES.find(c => c.id === activeCat)

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-96px)] lg:h-full">
      {/* Left sidebar: categories */}
      <div className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col lg:h-full overflow-y-auto">
        <div className="px-4 pt-5 pb-3">
          <h2 className="font-bold text-gray-800 text-sm">Your Practice Areas</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-tailored for your role</p>
        </div>

        {loadingCats ? (
          <div className="px-4 py-3">
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
            <p className="text-xs text-indigo-500 mt-3 text-center">Generating your personalised categories…</p>
          </div>
        ) : (
          <>
            {categoryError && (
              <div className="mx-3 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {categoryError}
              </div>
            )}
            <div className="px-3 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">For you</p>
              <div className="flex lg:block gap-2 overflow-x-auto pb-1">
                {userCats.map(cat => (
                  <button key={cat.id}
                    onClick={() => loadScenarios(cat.id, 'user')}
                    className={`min-w-52 lg:min-w-0 lg:w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition text-sm ${activeCat === cat.id && activeCatType === 'user' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{cat.name}</div>
                      <div className="text-xs text-gray-400">{cat.scenario_count ?? 0} scenarios</div>
                    </div>
                    {cat.source === 'user_requested' && (
                      <span className="text-xs text-indigo-400 shrink-0">custom</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 pb-2 mt-2 border-t border-gray-50 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Library</p>
              <div className="flex lg:block gap-2 overflow-x-auto pb-1">
                {GLOBAL_CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => loadScenarios(cat.id, 'global')}
                    className={`min-w-48 lg:min-w-0 lg:w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition text-sm ${activeCat === cat.id && activeCatType === 'global' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Create new category */}
        <div className="mt-auto p-3 border-t border-gray-100">
          {!showVoicePrompt && generating.phase === 'idle' && (
            <button onClick={() => setShowVoicePrompt(true)}
              className="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-500 text-xs font-medium rounded-xl hover:border-indigo-400 hover:text-indigo-700 transition">
              + Create new category
            </button>
          )}
          {generating.phase === 'processing' && (
            <div className="text-center py-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
              <p className="text-xs text-indigo-500">Creating…</p>
            </div>
          )}
          {generating.phase === 'done' && (
            <div className="bg-green-50 rounded-lg p-2 text-xs text-green-700">
              ✓ &quot;{generating.newCatName}&quot; added!
              <button onClick={() => setGenerating({ phase: 'idle' })} className="block text-green-500 mt-1">Dismiss</button>
            </div>
          )}
          {generating.phase === 'error' && (
            <div className="bg-red-50 rounded-lg p-2 text-xs text-red-600">
              {generating.error}
              <button onClick={() => setGenerating({ phase: 'idle' })} className="block text-red-400 mt-1">Dismiss</button>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* New category creation panel */}
        {showVoicePrompt && generating.phase !== 'processing' && (
          <NewCategoryPanel
            generating={generating}
            recSec={recSec}
            onStartVoice={startVoiceRequest}
            onStopVoice={stopVoiceAndGenerate}
            onTextSubmit={submitTextRequest}
            onCancel={() => { setShowVoicePrompt(false); setGenerating({ phase: 'idle' }) }}
          />
        )}

        {!showVoicePrompt && !activeCat && (
          <EmptyState onCreate={() => setShowVoicePrompt(true)} />
        )}

        {activeCat && (
          <div>
            {activeCatObj && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  {'icon' in activeCatObj && <span className="text-2xl">{activeCatObj.icon}</span>}
                  <h1 className="text-xl font-bold text-gray-800">
                    {'name' in activeCatObj ? activeCatObj.name : activeCatObj.label}
                  </h1>
                </div>
                {'description' in activeCatObj && activeCatObj.description && (
                  <p className="text-sm text-gray-400">{activeCatObj.description}</p>
                )}
                {'desc' in activeCatObj && (
                  <p className="text-sm text-gray-400">{activeCatObj.desc}</p>
                )}
              </div>
            )}

            {loadingScenarios ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : scenarioError ? (
              <div className="text-center py-16 text-red-500 text-sm">{scenarioError}</div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No scenarios yet in this category.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scenarios.map(s => <ScenarioCard key={s.id} s={s} scenarioType={activeCatType} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-16">
      <div className="text-5xl mb-4">🎤</div>
      <h2 className="text-lg font-bold text-gray-700 mb-2">Select a practice category</h2>
      <p className="text-sm text-gray-400 mb-6">
        Pick one from the left panel, or create a new category tailored to a specific situation you want to practice.
      </p>
      <button onClick={onCreate}
        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
        + Create custom category
      </button>
    </div>
  )
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`)
  }

  return data
}

function NewCategoryPanel({
  generating, recSec, onStartVoice, onStopVoice, onTextSubmit, onCancel
}: {
  generating: GeneratingState
  recSec: number
  onStartVoice: () => void
  onStopVoice: () => void
  onTextSubmit: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'choose' | 'voice' | 'text'>('choose')

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6 mb-6 max-w-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-800">Create a new practice category</h3>
          <p className="text-xs text-gray-400 mt-0.5">Describe what you want to practice — AuraXpress will generate scenarios for it.</p>
        </div>
        <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
      </div>

      {mode === 'choose' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => { setMode('voice'); onStartVoice() }}
            className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition text-sm">
            <span className="text-3xl">🎤</span>
            <span className="font-medium text-indigo-700">Speak it</span>
            <span className="text-xs text-gray-400 text-center">Say what you want to practice</span>
          </button>
          <button onClick={() => setMode('text')}
            className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-gray-50 transition text-sm">
            <span className="text-3xl">✍️</span>
            <span className="font-medium text-gray-700">Type it</span>
            <span className="text-xs text-gray-400 text-center">Describe in text</span>
          </button>
        </div>
      )}

      {mode === 'voice' && generating.phase === 'recording' && (
        <div className="text-center py-4">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute w-24 h-24 rounded-full bg-red-100 animate-ping opacity-40" />
            <button onClick={onStopVoice}
              className="relative w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl shadow-lg transition flex items-center justify-center">
              ⏹
            </button>
          </div>
          <p className="text-red-500 font-semibold">{Math.floor(recSec / 60)}:{(recSec % 60).toString().padStart(2, '0')}</p>
          <p className="text-xs text-gray-400 mt-1">Speak naturally… tap to stop</p>
          <p className="text-xs text-indigo-500 mt-2 italic">e.g. &quot;I want to practice salary negotiation with my manager&quot;</p>
        </div>
      )}

      {mode === 'text' && (
        <div className="mt-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="e.g. I want to practice explaining technical architecture to non-technical stakeholders"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setMode('choose')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Back</button>
            <button onClick={() => onTextSubmit(text)} disabled={text.trim().length < 5}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
              Generate scenarios
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-8 text-gray-400 text-sm">Loading…</div>}>
      <PracticeContent />
    </Suspense>
  )
}
