'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Phase = 'loading' | 'ready' | 'recording' | 'processing' | 'feedback' | 'error'

interface Scenario {
  id: string; title: string; context: string; question: string
  category: string; register: string; comm_goal: string
  ideal_wpm_min: number; ideal_wpm_max: number
}
interface EvalResult {
  scores: { clarity: number; fluency: number; vocabulary: number; structure: number; confidence: number; tone_match: number }
  overall: number
  what_worked: string
  improvement_focus: string
  model_response: string
  coach_note?: string
}
interface AttemptResult {
  evaluation: EvalResult
  ttsAudioUrl: string
  xp: { xpEarned: number; bonuses: string[]; newBadges: string[] }
  isPersonalBest: boolean
  mastery_stars: number
}

const DIM_LABELS: Record<string, string> = {
  clarity: 'Clarity', fluency: 'Fluency', vocabulary: 'Vocabulary',
  structure: 'Structure', confidence: 'Confidence', tone_match: 'Tone',
}
const FILLER_COLORS = ['bg-orange-100 text-orange-700', 'bg-red-100 text-red-700', 'bg-yellow-100 text-yellow-700']

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100
  const color = value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}/5</span>
    </div>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <span key={i} className={`text-lg ${i <= count ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
    </div>
  )
}

function PracticeSessionContent() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const searchParams   = useSearchParams()
  const scenarioType   = (searchParams.get('type') ?? 'global') as 'global' | 'user'

  const [phase, setPhase]           = useState<Phase>('loading')
  const [scenario, setScenario]     = useState<Scenario | null>(null)
  const [sessionId, setSessionId]   = useState('')
  const [transcript, setTranscript]   = useState('')
  const [fillerWords, setFillerWords] = useState<Record<string, number>>({})
  const [wpm, setWpm]                 = useState(0)
  const [result, setResult]           = useState<AttemptResult | null>(null)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)
  const [recordingSec, setRecordingSec] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioRef    = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, scenarioType }),
    })
      .then(r => r.json())
      .then(d => {
        setScenario(d.scenario)
        setSessionId(d.sessionId)
        setPhase('ready')
      })
      .catch(() => { setErrorMsg('Could not load scenario'); setPhase('error') })
  }, [scenarioId, scenarioType])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(250)
      mediaRef.current    = recorder
      startTimeRef.current = Date.now()
      setRecordingSec(0)
      setPhase('recording')

      timerRef.current = setInterval(() => {
        setRecordingSec(Math.round((Date.now() - startTimeRef.current) / 1000))
      }, 500)
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }

  async function stopRecording() {
    if (!mediaRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)

    const recorder = mediaRef.current
    setPhase('processing')
    setTranscript('')

    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())

    await new Promise<void>(resolve => { recorder.onstop = () => resolve() })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const dur = (Date.now() - startTimeRef.current) / 1000

    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')

    const stRes = await fetch('/api/stream', { method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' } })
    const stData = await stRes.json()

    if (!stData.transcript) {
      setErrorMsg('Could not transcribe your response. Please try again.')
      setPhase('error')
      return
    }

    setTranscript(stData.transcript)
    setFillerWords(stData.fillerWords)
    setWpm(stData.wpm)

    const evRes = await fetch('/api/session/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        transcript: stData.transcript,
        fillerWords: stData.fillerWords,
        wpm: stData.wpm,
        durationSec: dur,
      }),
    })
    const evData = await evRes.json()
    setResult(evData)
    setPhase('feedback')
  }

  function playTTS() {
    if (!result?.ttsAudioUrl) return
    setIsPlayingTTS(true)
    const audio = new Audio(result.ttsAudioUrl)
    audioRef.current = audio
    audio.play()
    audio.onended = () => setIsPlayingTTS(false)
  }

  function tryAgain() {
    setPhase('ready')
    setTranscript('')
    setFillerWords({})
    setWpm(0)
    setResult(null)
    setRecordingSec(0)
  }

  if (phase === 'loading') {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading scenario…</div>
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-red-500 text-sm">{errorMsg}</div>
        <Link href="/practice" className="text-indigo-600 hover:underline text-sm">← Back to scenarios</Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-4">
        <Link href="/practice" className="text-sm text-indigo-600 hover:underline">← Scenarios</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400">{scenario?.category?.replace('_', ' ')}</span>
            <h1 className="text-xl font-bold text-gray-800 mt-0.5">{scenario?.title}</h1>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full capitalize">{scenario?.register?.replace('_', ' ')}</span>
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-indigo-800 leading-relaxed">{scenario?.context}</p>
        </div>

        <div className="border-l-4 border-indigo-400 pl-4">
          <p className="text-sm font-semibold text-gray-600 mb-1">Question for you:</p>
          <p className="text-gray-800 font-medium leading-relaxed">{scenario?.question}</p>
        </div>
      </div>

      {(phase === 'ready' || phase === 'recording') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {phase === 'ready' ? (
            <>
              <p className="text-gray-500 text-sm mb-6">Read the scenario above, then tap the mic to answer.</p>
              <button onClick={startRecording}
                className="w-24 h-24 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-3xl shadow-lg shadow-indigo-200 transition flex items-center justify-center mx-auto"
              >
                🎤
              </button>
              <p className="text-xs text-gray-400 mt-4">Tap to start recording</p>
            </>
          ) : (
            <>
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-32 h-32 rounded-full bg-red-100 pulse-ring" />
                <button onClick={stopRecording}
                  className="relative w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl shadow-lg transition flex items-center justify-center"
                >
                  ⏹
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 bg-red-400 rounded-full soundwave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <p className="text-red-500 font-semibold">{formatTime(recordingSec)}</p>
              <p className="text-xs text-gray-400 mt-1">Recording… tap to stop</p>
            </>
          )}
        </div>
      )}

      {phase === 'processing' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Analysing your response…</p>
          <p className="text-xs text-gray-400 mt-1">Transcribing → Evaluating → Generating feedback</p>
        </div>
      )}

      {phase === 'feedback' && result && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg">Your Score</h2>
              <div className="flex items-center gap-3">
                <Stars count={result.mastery_stars} />
                {result.isPersonalBest && (
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Personal Best!</span>
                )}
              </div>
            </div>

            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-indigo-700">{result.evaluation.overall}</span>
              <span className="text-xl text-gray-400">/100</span>
            </div>

            <div className="space-y-3 mb-4">
              {Object.entries(result.evaluation.scores).map(([k, v]) => (
                <ScoreBar key={k} label={DIM_LABELS[k]} value={v} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
              <div>
                <div className="font-semibold text-gray-700 text-base">{wpm}</div>
                <div>Words/min <span className="text-gray-400">(ideal {scenario?.ideal_wpm_min}–{scenario?.ideal_wpm_max})</span></div>
              </div>
              <div>
                <div className={`font-semibold text-base ${Object.values(fillerWords).reduce((a,b) => a+b, 0) === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {Object.values(fillerWords).reduce((a, b) => a + b, 0)}
                </div>
                <div>Filler words</div>
                {Object.entries(fillerWords).length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {Object.entries(fillerWords).slice(0, 4).map(([w, c], i) => (
                      <span key={w} className={`px-1.5 py-0.5 rounded text-xs ${FILLER_COLORS[i % 3]}`}>
                        &quot;{w}&quot; ×{c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Feedback</h3>
            <div className="space-y-4">
              <div className="flex gap-3 bg-green-50 rounded-xl p-4">
                <span className="text-green-500 text-xl shrink-0">✓</span>
                <div>
                  <div className="text-xs font-semibold text-green-700 mb-1">What worked</div>
                  <p className="text-sm text-gray-700">{result.evaluation.what_worked}</p>
                </div>
              </div>
              <div className="flex gap-3 bg-orange-50 rounded-xl p-4">
                <span className="text-orange-400 text-xl shrink-0">→</span>
                <div>
                  <div className="text-xs font-semibold text-orange-700 mb-1">One thing to work on</div>
                  <p className="text-sm text-gray-700">{result.evaluation.improvement_focus}</p>
                </div>
              </div>
              {result.evaluation.coach_note && (
                <div className="flex gap-3 bg-indigo-50 rounded-xl p-4">
                  <span className="text-indigo-400 text-xl shrink-0">💡</span>
                  <p className="text-sm text-gray-700">{result.evaluation.coach_note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Model Response</h3>
              <button onClick={playTTS} disabled={isPlayingTTS}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {isPlayingTTS ? '🔊 Playing…' : '▶ Listen'}
              </button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-indigo-300 pl-4">
              &quot;{result.evaluation.model_response}&quot;
            </p>
          </div>

          {result.xp.xpEarned > 0 && (
            <div className="bg-indigo-600 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xl">+{result.xp.xpEarned} XP earned</div>
                  <div className="text-indigo-200 text-sm mt-0.5">{result.xp.bonuses[0]}</div>
                </div>
                {result.xp.newBadges.length > 0 && (
                  <div className="text-right">
                    <div className="text-indigo-200 text-xs mb-1">New badge!</div>
                    <div className="text-2xl">{result.xp.newBadges[0]}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Your response (transcript)</div>
            <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={tryAgain}
              className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl transition">
              Try Again
            </button>
            <Link href="/practice" className="flex-1 py-3 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold rounded-xl transition text-center">
              Next Scenario
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>}>
      <PracticeSessionContent />
    </Suspense>
  )
}
