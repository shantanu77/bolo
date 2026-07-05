'use client'
import { useRef, useState } from 'react'

type Phase = 'idle' | 'recording' | 'processing' | 'done' | 'error'

interface StructuredBio {
  summary?: string
  current_role?: string
  seniority?: string
  years_experience?: number
  industry?: string
  company_type?: string
  team_size?: string
  key_responsibilities?: string[]
  who_they_speak_with?: string[]
  communication_contexts?: string[]
  evaluation_lens?: string
  self_mentioned_challenges?: string[]
  aspirations?: string[]
}

interface Props {
  onDone: (bio: { transcript: string; structured: StructuredBio }) => void
  onClose: () => void
}

const PROMPTS = [
  "Tell me about yourself — your role, what you do day to day, who you work with, and what kind of communication situations you deal with most.",
  "What are your biggest communication challenges? And what do you want to achieve through this practice?",
]

export default function BioCaptureModal({ onDone, onClose }: Props) {
  const [phase, setPhase]   = useState<Phase>('idle')
  const [promptIdx]         = useState(0)
  const [recSec, setRecSec]       = useState(0)
  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState<StructuredBio | null>(null)
  const [error, setError]         = useState('')

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<NodeJS.Timeout | null>(null)
  const startRef    = useRef<number>(0)

  async function startRecording() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(250)
      mediaRef.current = recorder
      startRef.current  = Date.now()
      setRecSec(0)
      setPhase('recording')
      timerRef.current = setInterval(() => setRecSec(Math.round((Date.now() - startRef.current) / 1000)), 500)
    } catch {
      setError('Microphone access denied.')
      setPhase('error')
    }
  }

  async function stopAndProcess() {
    if (!mediaRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('processing')

    const recorder = mediaRef.current
    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())
    await new Promise<void>(resolve => { recorder.onstop = () => resolve() })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const res  = await fetch('/api/bio', { method: 'POST', body: blob, headers: { 'Content-Type': 'audio/webm' } })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Processing failed. Please try again.')
      setPhase('error')
      return
    }

    setTranscript(data.transcript)
    setStructured(data.structured)
    setPhase('done')
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Tell AuraXpress about yourself</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your profile shapes every scenario and evaluation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          {/* Prompt card */}
          <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Speak about this</p>
            <p className="text-gray-700 text-sm leading-relaxed">{PROMPTS[promptIdx]}</p>
          </div>

          {phase === 'idle' && (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-5">
                Speak freely for 30–90 seconds. AuraXpress will structure what you say into your profile automatically.
              </p>
              <button onClick={startRecording}
                className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-3xl shadow-lg shadow-indigo-200 transition flex items-center justify-center mx-auto">
                🎤
              </button>
              <p className="text-xs text-gray-400 mt-3">Tap to start speaking</p>
            </div>
          )}

          {phase === 'recording' && (
            <div className="text-center">
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute w-28 h-28 rounded-full bg-red-100 animate-ping opacity-40" />
                <button onClick={stopAndProcess}
                  className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl shadow-lg transition flex items-center justify-center">
                  ⏹
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 rounded-full bg-red-400"
                    style={{ height: `${8 + Math.random() * 16}px`, animation: `soundwave 0.6s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <p className="text-red-500 font-semibold text-lg">{formatTime(recSec)}</p>
              <p className="text-xs text-gray-400 mt-1">Recording… tap to stop when done</p>
            </div>
          )}

          {phase === 'processing' && (
            <div className="text-center py-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600 font-medium text-sm">Transcribing and building your profile…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center py-4">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={() => { setPhase('idle'); setError('') }}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
                Try again
              </button>
            </div>
          )}

          {phase === 'done' && structured && (
            <div>
              <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-100">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Profile captured</p>
                <p className="text-sm text-gray-700 leading-relaxed">{structured.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                {[
                  { label: 'Role',       value: structured.current_role },
                  { label: 'Seniority',  value: structured.seniority },
                  { label: 'Industry',   value: structured.industry },
                  { label: 'Company',    value: structured.company_type },
                  { label: 'Experience', value: structured.years_experience ? `${structured.years_experience} years` : null },
                  { label: 'Team size',  value: structured.team_size },
                ].filter(i => i.value).map(i => (
                  <div key={i.label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-400">{i.label}: </span>
                    <span className="font-medium text-gray-700">{i.value}</span>
                  </div>
                ))}
              </div>

              {structured.evaluation_lens && (
                <div className="bg-indigo-50 rounded-lg px-4 py-3 text-xs text-indigo-700 mb-4 border border-indigo-100">
                  <span className="font-semibold">How AuraXpress will evaluate you: </span>
                  {structured.evaluation_lens}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setPhase('idle') }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:border-indigo-300 transition">
                  Record again
                </button>
                <button onClick={() => onDone({ transcript, structured })}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                  Save profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
