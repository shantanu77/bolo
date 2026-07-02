import { NextRequest, NextResponse } from 'next/server'
import { DeepgramClient } from '@deepgram/sdk'
import { Readable } from 'stream'

const FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'so', 'right', 'okay', 'hmm']

interface DgWord { word: string }
interface DgAlternative { transcript: string; words: DgWord[] }
interface DgChannel { alternatives: DgAlternative[] }
interface DgResponse { metadata?: { duration?: number }; results?: { channels?: DgChannel[] } }

export async function POST(req: NextRequest) {
  const body  = await req.arrayBuffer()
  const audio = Buffer.from(body)

  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! })

  const httpResponse = await deepgram.listen.v1.media.transcribeFile(
    Readable.from(audio),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { model: 'nova-2', language: 'en-IN', smart_format: true, punctuate: true, filler_words: true } as any
  )

  const data = httpResponse as unknown as DgResponse

  const alternative = data?.results?.channels?.[0]?.alternatives?.[0]
  const transcript  = alternative?.transcript ?? ''
  const words       = alternative?.words ?? []

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

  return NextResponse.json({ transcript, fillerWords, fillerCount, wpm, wordCount, duration })
}
