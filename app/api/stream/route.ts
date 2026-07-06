import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { DeepgramClient } from '@deepgram/sdk'
import { Readable } from 'stream'
import { authOptions } from '@/lib/auth'
import { logUsage } from '@/lib/usage'

const FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'so', 'right', 'okay', 'hmm']

interface DgWord { word: string }
interface DgAlternative { transcript: string; words: DgWord[] }
interface DgChannel { alternatives: DgAlternative[] }
interface DgResponse { metadata?: { duration?: number }; results?: { channels?: DgChannel[] } }

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body  = await req.arrayBuffer()
    const audio = Buffer.from(body)

    if (!audio.length) {
      return NextResponse.json({ error: 'No audio received.' }, { status: 400 })
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: 'Transcription service is not configured.' }, { status: 500 })
    }

    const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY })

    const httpResponse = await deepgram.listen.v1.media.transcribeFile(
      Readable.from(audio),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { model: 'nova-2', language: 'en-IN', smart_format: true, punctuate: true, filler_words: true } as any
    )

    const data = httpResponse as unknown as DgResponse

    const alternative = data?.results?.channels?.[0]?.alternatives?.[0]
    const transcript  = alternative?.transcript ?? ''
    const words       = alternative?.words ?? []

    if (!transcript.trim()) {
      return NextResponse.json({ error: 'Could not transcribe your response. Please speak clearly and try again.' }, { status: 422 })
    }

    const fillerWords: Record<string, number> = {}
    words.forEach(w => {
      const word = w.word?.toLowerCase().trim()
      if (FILLERS.includes(word)) {
        fillerWords[word] = (fillerWords[word] ?? 0) + 1
      }
    })

    const wordCount   = words.length
    const duration    = data?.metadata?.duration ?? 1
    const wpm         = duration > 0 ? Math.round((wordCount / duration) * 60) : 0
    const fillerCount = Object.values(fillerWords).reduce((a, b) => a + b, 0)

    logUsage({
      userId: session.user.id,
      callType: 'transcription',
      model: 'nova-2',
      units: duration,
    })

    return NextResponse.json({ transcript, fillerWords, fillerCount, wpm, wordCount, duration })
  } catch (err) {
    console.error('Transcription failed', err)
    return NextResponse.json({ error: 'Transcription failed. Please try again.' }, { status: 502 })
  }
}
