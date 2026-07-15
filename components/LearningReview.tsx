'use client'

import { useEffect, useRef, useState } from 'react'

type Phase = 'generating' | 'ready' | 'recording' | 'transcribing' | 'evaluating' | 'feedback' | 'complete' | 'error'

interface ReviewQuestion {
  id: string
  prompt: string
  focus: string
  expected_points: string[]
}

interface ReviewEvaluation {
  scores: {
    content_accuracy: number
    relevance: number
    structure: number
    communication: number
  }
  overall: number
  rating_label: string
  what_worked: string
  improvement: string
  missed_points: string[]
  model_answer: string
}

interface ReviewResult {
  question: ReviewQuestion
  transcript: string
  evaluation: ReviewEvaluation
}

const SCORE_LABELS: Record<keyof ReviewEvaluation['scores'], string> = {
  content_accuracy: 'Content',
  relevance: 'Relevance',
  structure: 'Structure',
  communication: 'Communication',
}

export default function LearningReview({ guideId, guideTitle, onClose }: { guideId: string; guideTitle: string; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('generating')
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [results, setResults] = useState<ReviewResult[]>([])
  const [currentResult, setCurrentResult] = useState<ReviewResult | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)

  useEffect(() => {
    generateQuestions()
    return stopMedia
    // A new component is mounted whenever a guide review starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId])

  async function generateQuestions() {
    stopMedia()
    setPhase('generating')
    setError('')
    setQuestions([])
    setResults([])
    setCurrentResult(null)
    setQuestionIndex(0)

    try {
      const data = await fetchJson(`/api/learning-guides/${guideId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      if (!Array.isArray(data.questions) || data.questions.length !== 3) throw new Error('Could not create three review questions.')
      setQuestions(data.questions)
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate review questions.')
      setPhase('error')
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredType = 'audio/webm;codecs=opus'
      const recorder = MediaRecorder.isTypeSupported(preferredType)
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream)

      chunksRef.current = []
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorderRef.current = recorder
      setRecordingSeconds(0)
      startedAtRef.current = Date.now()
      recorder.start(250)
      timerRef.current = setInterval(() => setRecordingSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)), 500)
      setPhase('recording')
    } catch {
      setError('Microphone access was denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current
    const question = questions[questionIndex]
    if (!recorder || recorder.state === 'inactive' || !question) return

    clearTimer()
    setPhase('transcribing')
    const stopped = new Promise<void>(resolve => recorder.addEventListener('stop', () => resolve(), { once: true }))
    recorder.stop()
    recorder.stream.getTracks().forEach(track => track.stop())
    await stopped

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
    recorderRef.current = null

    try {
      const transcription = await fetchJson('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      })

      setPhase('evaluating')
      const data = await fetchJson(`/api/learning-guides/${guideId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          question: question.prompt,
          expected_points: question.expected_points,
          transcript: transcription.transcript,
          wpm: transcription.wpm,
          filler_words: transcription.fillerWords,
        }),
      })

      const result = { question, transcript: transcription.transcript, evaluation: data.evaluation } as ReviewResult
      setCurrentResult(result)
      setResults(current => [...current, result])
      setPhase('feedback')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not evaluate your answer.')
      setPhase('error')
    }
  }

  function goToNextQuestion() {
    if (questionIndex >= questions.length - 1) {
      setPhase('complete')
      return
    }
    setQuestionIndex(index => index + 1)
    setCurrentResult(null)
    setRecordingSeconds(0)
    setPhase('ready')
  }

  function stopMedia() {
    clearTimer()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorder?.stream.getTracks().forEach(track => track.stop())
    recorderRef.current = null
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const question = questions[questionIndex]
  const completedAverage = results.length
    ? results.reduce((sum, result) => sum + result.evaluation.overall, 0) / results.length
    : 0

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-gray-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Learning review">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Three-question spoken review</div>
            <h2 className="mt-1 font-bold text-gray-800">{guideTitle}</h2>
          </div>
          <button type="button" onClick={() => { stopMedia(); onClose() }} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Close</button>
        </div>

        <div className="p-4 sm:p-6">
          {phase === 'generating' && <LoadingState title="Creating your review" detail="Generating three fresh questions from this learning guide…" />}

          {phase === 'error' && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button type="button" onClick={() => questions.length ? setPhase('ready') : generateQuestions()} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Try again</button>
            </div>
          )}

          {question && ['ready', 'recording', 'transcribing', 'evaluating', 'feedback'].includes(phase) && (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-600">Question {questionIndex + 1} of 3</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-500">{question.focus}</span>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4 sm:p-5">
                <p className="text-base font-semibold leading-relaxed text-gray-800">{question.prompt}</p>
                <div className="mt-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                  <div><strong className="text-indigo-700">Start:</strong> State your main answer directly.</div>
                  <div><strong className="text-indigo-700">Middle:</strong> Explain it with relevant detail or an example.</div>
                  <div><strong className="text-indigo-700">End:</strong> Summarise the lesson or action clearly.</div>
                </div>
              </div>

              {phase === 'ready' && (
                <div className="py-8 text-center">
                  <p className="mb-5 text-sm text-gray-500">Plan your answer, then record for about 30–90 seconds.</p>
                  <button type="button" onClick={startRecording} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700" aria-label="Start recording">🎤</button>
                  <p className="mt-3 text-xs text-gray-400">Tap to start recording</p>
                </div>
              )}

              {phase === 'recording' && (
                <div className="py-8 text-center">
                  <button type="button" onClick={stopRecording} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-lg shadow-red-100 hover:bg-red-600" aria-label="Stop and evaluate recording">■</button>
                  <p className="mt-3 font-semibold tabular-nums text-red-500">{formatTime(recordingSeconds)}</p>
                  <p className="mt-1 text-xs text-gray-400">Tap stop to transcribe and evaluate</p>
                </div>
              )}

              {phase === 'transcribing' && <LoadingState title="Transcribing your answer" detail="Turning your recording into text…" />}
              {phase === 'evaluating' && <LoadingState title="Evaluating your answer" detail="Checking content, relevance, structure, and communication…" />}

              {phase === 'feedback' && currentResult && (
                <EvaluationPanel result={currentResult} isLast={questionIndex === questions.length - 1} onNext={goToNextQuestion} />
              )}
            </div>
          )}

          {phase === 'complete' && (
            <div>
              <div className="rounded-2xl bg-indigo-600 p-6 text-center text-white">
                <div className="text-sm text-indigo-200">Review complete</div>
                <div className="mt-1 text-5xl font-bold">{completedAverage.toFixed(2)}<span className="text-xl text-indigo-200">/100</span></div>
                <p className="mt-2 text-sm text-indigo-100">Average across all three answers</p>
              </div>
              <div className="mt-5 space-y-3">
                {results.map((result, index) => (
                  <div key={result.question.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-indigo-500">Question {index + 1}</div>
                      <div className="mt-0.5 truncate text-sm text-gray-700">{result.question.prompt}</div>
                      <div className="mt-1 text-xs text-gray-400">{result.evaluation.rating_label}</div>
                    </div>
                    <div className="shrink-0 text-lg font-bold text-indigo-700">{result.evaluation.overall.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={generateQuestions} className="flex-1 rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">Try three new questions</button>
                <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Finish review</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EvaluationPanel({ result, isLast, onNext }: { result: ReviewResult; isLast: boolean; onNext: () => void }) {
  const evaluation = result.evaluation
  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-white p-4 sm:flex-row sm:items-center">
        <div className="text-center sm:w-32">
          <div className="text-4xl font-bold text-indigo-700">{evaluation.overall.toFixed(2)}</div>
          <div className="text-xs text-gray-400">out of 100</div>
          <div className="mt-1 text-xs font-semibold text-indigo-600">{evaluation.rating_label}</div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {Object.entries(evaluation.scores).map(([key, score]) => (
            <div key={key} className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-[11px] text-gray-400">{SCORE_LABELS[key as keyof ReviewEvaluation['scores']]}</div>
              <div className="font-semibold text-gray-700">{Number(score).toFixed(2)}/5</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <div className="mb-1 text-xs font-semibold text-gray-400">Your transcript</div>
        <p className="text-sm leading-relaxed text-gray-700">{result.transcript}</p>
      </div>
      <div className="rounded-xl border border-green-100 bg-green-50 p-4">
        <div className="mb-1 text-xs font-semibold text-green-700">What worked</div>
        <p className="text-sm text-gray-700">{evaluation.what_worked}</p>
      </div>
      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
        <div className="mb-1 text-xs font-semibold text-orange-700">Improve next</div>
        <p className="text-sm text-gray-700">{evaluation.improvement}</p>
        {evaluation.missed_points.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {evaluation.missed_points.map(point => <li key={point}>• {point}</li>)}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-gray-100 p-4">
        <div className="mb-1 text-xs font-semibold text-gray-500">A stronger answer</div>
        <p className="text-sm italic leading-relaxed text-gray-700">&quot;{evaluation.model_answer}&quot;</p>
      </div>
      <button type="button" onClick={onNext} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
        {isLast ? 'See final review score' : 'Continue to next question'}
      </button>
    </div>
  )
}

function LoadingState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      <div className="font-semibold text-gray-700">{title}</div>
      <div className="mt-1 text-xs text-gray-400">{detail}</div>
    </div>
  )
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
  return data
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
