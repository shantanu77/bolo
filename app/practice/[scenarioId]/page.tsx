'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Phase = 'loading' | 'ready' | 'recording' | 'processing' | 'feedback' | 'error'
type ProcessingStep = 'transcribing' | 'evaluating' | 'saving'

interface Scenario {
  id: string; title: string; context: string; question: string
  category: string; register: string; comm_goal: string
  ideal_wpm_min: number; ideal_wpm_max: number
}
interface EvalResult {
  scores: { clarity: number; fluency: number; vocabulary: number; structure: number; confidence: number; tone_match: number }
  dimension_evidence?: Record<string, DimensionEvidence>
  overall: number
  what_worked: string
  improvement_focus: string
  model_response: string
  voice_summary?: {
    strengths: string
    priority_fix: string
    polished_version: string
    next_practice: string
  }
  coach_note?: string
}
interface DimensionEvidence {
  score: number
  verdict: string
  evidence: string[]
  impact: string
  fix: string
  rewritten_sentence?: string
  study_topic?: string
}
interface AttemptResult {
  evaluation: EvalResult
  ttsAudioUrl: string
  xp: { xpEarned: number; bonuses: string[]; newBadges: string[] }
  isPersonalBest: boolean
  mastery_stars: number
}
interface StudyGuide {
  title: string
  objective: string
  lesson: Array<{ heading: string; body: string }>
  examples: Array<{ weak: string; better: string; why: string }>
  quick_rule: string
  review_question: {
    prompt: string
    expected_points: string[]
  }
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
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingCurrent, setRecordingCurrent] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingSpeed, setRecordingSpeed] = useState(1)
  const [recordingSec, setRecordingSec] = useState(0)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('transcribing')
  const [errorMsg, setErrorMsg] = useState('')
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null)
  const [studyGuideTopic, setStudyGuideTopic] = useState('')
  const [studyGuideId, setStudyGuideId] = useState('')
  const [studyGuideLoading, setStudyGuideLoading] = useState('')
  const [studyGuideError, setStudyGuideError] = useState('')
  const [showReviewQuestion, setShowReviewQuestion] = useState(false)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    }
  }, [recordingUrl])

  useEffect(() => {
    fetchJson('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, scenarioType }),
    })
      .then(d => {
        setScenario(d.scenario)
        setSessionId(d.sessionId)
        setPhase('ready')
      })
      .catch(err => {
        setErrorMsg(err instanceof Error ? err.message : 'Could not load scenario')
        setPhase('error')
      })
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
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecordingUrl(URL.createObjectURL(blob))
    setRecordingCurrent(0)
    setRecordingDuration(dur)
    setIsPlayingRecording(false)

    try {
      setProcessingStep('transcribing')
      const stData = await fetchJson('/api/stream', {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': 'audio/webm' },
      })

      setTranscript(stData.transcript)
      setFillerWords(stData.fillerWords)
      setWpm(stData.wpm)

      setProcessingStep('evaluating')
      const evData = await fetchJson('/api/session/evaluate', {
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
      setProcessingStep('saving')
      setResult(evData)
      setPhase('feedback')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not process your response. Please try again.')
      setPhase('error')
    }
  }

  function playTTS() {
    if (!result?.ttsAudioUrl) return
    setIsPlayingTTS(true)
    const audio = new Audio(result.ttsAudioUrl)
    audioRef.current = audio
    audio.play()
    audio.onended = () => setIsPlayingTTS(false)
  }

  function toggleRecordingPlayback() {
    const audio = recordingAudioRef.current
    if (!audio) return

    audio.playbackRate = recordingSpeed
    if (audio.paused) {
      audio.play()
      setIsPlayingRecording(true)
    } else {
      audio.pause()
      setIsPlayingRecording(false)
    }
  }

  function seekRecording(sec: number) {
    const audio = recordingAudioRef.current
    if (!audio) return
    const next = Math.max(0, Math.min(sec, recordingDuration || audio.duration || 0))
    audio.currentTime = next
    setRecordingCurrent(next)
  }

  function changeRecordingSpeed(speed: number) {
    setRecordingSpeed(speed)
    if (recordingAudioRef.current) recordingAudioRef.current.playbackRate = speed
  }

  function tryAgain() {
    recordingAudioRef.current?.pause()
    setPhase('ready')
    setTranscript('')
    setFillerWords({})
    setWpm(0)
    setResult(null)
    setRecordingSec(0)
    setRecordingCurrent(0)
    setIsPlayingRecording(false)
    setStudyGuide(null)
    setStudyGuideTopic('')
    setStudyGuideId('')
    setStudyGuideError('')
    setShowReviewQuestion(false)
  }

  async function createStudyGuide(label: string, item: DimensionEvidence) {
    if (!scenario) return
    setStudyGuide(null)
    setStudyGuideId('')
    setStudyGuideError('')
    setShowReviewQuestion(false)
    setStudyGuideTopic(item.study_topic || label)
    setStudyGuideLoading(label)
    try {
      const data = await fetchJson('/api/study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: label,
          topic: item.study_topic,
          verdict: item.verdict,
          impact: item.impact,
          fix: item.fix,
          rewritten_sentence: item.rewritten_sentence,
          evidence: item.evidence,
          scenario_id: scenario.id,
          scenario_type: scenarioType,
          scenario_question: scenario.question,
        }),
      })
      setStudyGuide(data.guide)
      setStudyGuideId(data.savedGuide?.id ?? '')
    } catch (err) {
      setStudyGuideError(err instanceof Error ? err.message : 'Could not create study guide.')
    } finally {
      setStudyGuideLoading('')
    }
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto lg:mx-0">
      <div className="mb-4">
        <Link href="/practice" className="text-sm text-indigo-600 hover:underline">← Scenarios</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Analysing your response</p>
          <div className="mt-5 max-w-sm mx-auto text-left space-y-3">
            <ProcessingRow active={processingStep === 'transcribing'} done={processingStep !== 'transcribing'} label="Transcribing your audio" />
            <ProcessingRow active={processingStep === 'evaluating'} done={processingStep === 'saving'} label="Checking clarity, fluency, tone, and confidence" />
            <ProcessingRow active={processingStep === 'saving'} done={false} label="Preparing written feedback and voice summary" />
          </div>
        </div>
      )}

      {phase === 'feedback' && result && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
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

          {result.evaluation.dimension_evidence && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Score Evidence</h3>
              <p className="text-xs text-gray-400 mb-4">Each score is tied to what you actually said and how it affected the result.</p>
              <div className="space-y-3">
                {Object.entries(result.evaluation.dimension_evidence).map(([key, item]) => (
                  <EvidenceCard
                    key={key}
                    label={DIM_LABELS[key]}
                    item={item}
                    loading={studyGuideLoading === DIM_LABELS[key]}
                    onCreateGuide={() => createStudyGuide(DIM_LABELS[key], item)}
                  />
                ))}
              </div>
            </div>
          )}

          {(studyGuide || studyGuideLoading || studyGuideError) && (
            <StudyGuidePanel
              guide={studyGuide}
              topic={studyGuideTopic}
              savedGuideId={studyGuideId}
              loading={Boolean(studyGuideLoading)}
              error={studyGuideError}
              showReviewQuestion={showReviewQuestion}
              onReview={() => setShowReviewQuestion(true)}
            />
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">AI Voice Summary</h3>
              <button onClick={playTTS} disabled={isPlayingTTS}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {isPlayingTTS ? '🔊 Playing…' : '▶ Listen'}
              </button>
            </div>
            {result.evaluation.voice_summary && (
              <div className="grid gap-2 mb-4">
                <SummaryItem label="Strength" text={result.evaluation.voice_summary.strengths} tone="green" />
                <SummaryItem label="Priority fix" text={result.evaluation.voice_summary.priority_fix} tone="orange" />
                <SummaryItem label="Next practice" text={result.evaluation.voice_summary.next_practice} tone="indigo" />
              </div>
            )}
            <div className="text-xs font-semibold text-gray-500 mb-2">Polished version</div>
            <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-indigo-300 pl-4">
              &quot;{result.evaluation.model_response}&quot;
            </p>
          </div>

          {recordingUrl && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Your Recording</h3>
              <audio
                ref={recordingAudioRef}
                src={recordingUrl}
                preload="metadata"
                onLoadedMetadata={e => setRecordingDuration(e.currentTarget.duration || recordingDuration)}
                onTimeUpdate={e => setRecordingCurrent(e.currentTarget.currentTime)}
                onEnded={() => setIsPlayingRecording(false)}
              />
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => seekRecording(recordingCurrent - 5)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:border-indigo-200 hover:text-indigo-700 transition"
                >
                  -5s
                </button>
                <button
                  onClick={toggleRecordingPlayback}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  {isPlayingRecording ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => seekRecording(recordingCurrent + 5)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:border-indigo-200 hover:text-indigo-700 transition"
                >
                  +5s
                </button>
                <select
                  value={recordingSpeed}
                  onChange={e => changeRecordingSpeed(Number(e.target.value))}
                  className="ml-auto rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Playback speed"
                >
                  {[0.75, 1, 1.25, 1.5].map(speed => (
                    <option key={speed} value={speed}>{speed}x</option>
                  ))}
                </select>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(recordingDuration, 1)}
                step={0.1}
                value={Math.min(recordingCurrent, recordingDuration || recordingCurrent)}
                onChange={e => seekRecording(Number(e.target.value))}
                className="w-full accent-indigo-600"
                aria-label="Recording timeline"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(Math.floor(recordingCurrent))}</span>
                <span>{formatTime(Math.floor(recordingDuration || 0))}</span>
              </div>
            </div>
          )}

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
            <HighlightedTranscript
              transcript={transcript}
              evidence={Object.values(result.evaluation.dimension_evidence ?? {}).flatMap(item => item.evidence ?? [])}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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

function ProcessingRow({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${active ? 'bg-indigo-50 text-indigo-700' : done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-indigo-600 text-white animate-pulse' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {done ? '✓' : active ? '…' : ''}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function EvidenceCard({
  label, item, loading, onCreateGuide,
}: {
  label: string
  item: DimensionEvidence
  loading: boolean
  onCreateGuide: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{item.verdict}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">{item.score}/5</span>
      </div>
      {item.evidence?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.evidence.map(quote => (
            <span key={quote} className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
              &quot;{quote}&quot;
            </span>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-3">
          <div className="text-xs font-semibold text-gray-400 mb-1">What went wrong</div>
          <p className="text-xs text-gray-700 leading-relaxed">{item.impact}</p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <div className="text-xs font-semibold text-gray-400 mb-1">How to fix it</div>
          <p className="text-xs text-gray-700 leading-relaxed">{item.fix}</p>
        </div>
      </div>
      {item.rewritten_sentence && (
        <div className="mt-3 rounded-lg border border-green-100 bg-green-50 p-3">
          <div className="text-xs font-semibold text-green-700 mb-1">Try saying it like this</div>
          <p className="text-sm text-gray-800 leading-relaxed">&quot;{item.rewritten_sentence}&quot;</p>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-400">
          {item.study_topic ? `Guide topic: ${item.study_topic}` : 'Create a focused guide for this issue'}
        </div>
        <button
          type="button"
          onClick={onCreateGuide}
          disabled={loading}
          className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
        >
          {loading ? 'Creating guide...' : 'Create AI study guide'}
        </button>
      </div>
    </div>
  )
}

function StudyGuidePanel({
  guide, topic, savedGuideId, loading, error, showReviewQuestion, onReview,
}: {
  guide: StudyGuide | null
  topic: string
  savedGuideId: string
  loading: boolean
  error: string
  showReviewQuestion: boolean
  onReview: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">AI Study Guide</div>
        <h3 className="mt-1 text-lg font-bold text-gray-800">{guide?.title ?? topic}</h3>
      </div>

      {loading && (
        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700">
          Creating a focused guide for this issue...
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {guide && (
        <div className="space-y-5">
          {savedGuideId && (
            <div className="flex flex-col gap-2 rounded-xl border border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-green-800">Saved to Learning Guide.</p>
              <Link
                href={`/learning-guides?guide=${savedGuideId}`}
                className="text-sm font-semibold text-green-700 hover:text-green-900"
              >
                Open saved guide
              </Link>
            </div>
          )}

          <p className="text-sm text-gray-600 leading-relaxed">{guide.objective}</p>

          <div className="grid gap-3">
            {guide.lesson?.map(section => (
              <div key={section.heading} className="rounded-xl bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-800">{section.heading}</div>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>

          {guide.examples?.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-800">Examples</div>
              <div className="grid gap-3">
                {guide.examples.map((example, idx) => (
                  <div key={`${example.weak}-${idx}`} className="rounded-xl border border-gray-100 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 mb-1">Weak</div>
                        <p className="text-sm text-gray-600">&quot;{example.weak}&quot;</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-green-600 mb-1">Better</div>
                        <p className="text-sm font-medium text-gray-800">&quot;{example.better}&quot;</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{example.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guide.quick_rule && (
            <div className="rounded-xl bg-indigo-50 p-4 text-sm font-medium text-indigo-800">
              {guide.quick_rule}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            {!showReviewQuestion ? (
              <button
                type="button"
                onClick={onReview}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Review my learning
              </button>
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">Practice question</div>
                <p className="text-sm font-semibold text-gray-800">{guide.review_question?.prompt}</p>
                {guide.review_question?.expected_points?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1">Your answer should include</div>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {guide.review_question.expected_points.map(point => (
                        <li key={point}>- {point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, text, tone }: { label: string; text: string; tone: 'green' | 'orange' | 'indigo' }) {
  const tones = {
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <span className="text-xs font-bold uppercase tracking-wide">{label}: </span>
      <span className="text-sm">{text}</span>
    </div>
  )
}

function HighlightedTranscript({ transcript, evidence }: { transcript: string; evidence: string[] }) {
  const quotes = evidence
    .map(q => q.trim())
    .filter(q => q.length >= 3 && transcript.toLowerCase().includes(q.toLowerCase()))

  if (!quotes.length) {
    return <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
  }

  const parts: Array<{ text: string; highlight: boolean }> = [{ text: transcript, highlight: false }]

  quotes.forEach(quote => {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part.highlight) continue
      const idx = part.text.toLowerCase().indexOf(quote.toLowerCase())
      if (idx === -1) continue
      parts.splice(
        i,
        1,
        { text: part.text.slice(0, idx), highlight: false },
        { text: part.text.slice(idx, idx + quote.length), highlight: true },
        { text: part.text.slice(idx + quote.length), highlight: false },
      )
      break
    }
  })

  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      {parts.filter(p => p.text).map((part, i) => part.highlight ? (
        <mark key={i} className="rounded bg-yellow-100 px-1 text-yellow-900">{part.text}</mark>
      ) : (
        <span key={i}>{part.text}</span>
      ))}
    </p>
  )
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`)
  }

  return data
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>}>
      <PracticeSessionContent />
    </Suspense>
  )
}
