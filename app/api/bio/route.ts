import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { DeepgramClient } from '@deepgram/sdk'
import OpenAI from 'openai'
import { Readable } from 'stream'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface DgWord { word: string }
interface DgAlternative { transcript: string; words: DgWord[] }
interface DgChannel { alternatives: DgAlternative[] }
interface DgResponse { results?: { channels?: DgChannel[] } }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const persona = await queryOne<{
    bio_transcript: string | null
    bio_structured: string | null
    bio_recorded_at: string | null
  }>('SELECT bio_transcript, bio_structured, bio_recorded_at FROM personas WHERE user_id = ?', [session.user.id])

  if (!persona?.bio_transcript) return NextResponse.json({ bio: null })

  return NextResponse.json({
    bio: {
      transcript:  persona.bio_transcript,
      structured:  persona.bio_structured ? JSON.parse(persona.bio_structured) : null,
      recorded_at: persona.bio_recorded_at,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body  = await req.arrayBuffer()
  const audio = Buffer.from(body)

  // 1. Transcribe via Deepgram
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! })
  const dgResponse = await deepgram.listen.v1.media.transcribeFile(
    Readable.from(audio),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { model: 'nova-2', language: 'en-IN', smart_format: true, punctuate: true } as any
  )
  const dgData  = dgResponse as unknown as DgResponse
  const transcript = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

  if (!transcript || transcript.length < 20) {
    return NextResponse.json({ error: 'Could not understand the recording. Please speak clearly and try again.' }, { status: 422 })
  }

  // 2. Structure via GPT-4o
  const structured = await structureBio(transcript)

  // 3. Save to personas (upsert)
  const existing = await queryOne('SELECT id FROM personas WHERE user_id = ?', [session.user.id])
  if (existing) {
    await execute(
      'UPDATE personas SET bio_transcript = ?, bio_structured = ?, bio_recorded_at = NOW() WHERE user_id = ?',
      [transcript, JSON.stringify(structured), session.user.id]
    )
  } else {
    await execute(
      'INSERT INTO personas (id, user_id, bio_transcript, bio_structured, bio_recorded_at) VALUES (UUID(), ?, ?, ?, NOW())',
      [session.user.id, transcript, JSON.stringify(structured)]
    )
  }

  return NextResponse.json({ transcript, structured })
}

async function structureBio(transcript: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are analysing a spoken self-introduction from an Indian professional who is using an English coaching app.

Extract structured information from the following transcript and return a JSON object.

Transcript:
"""
${transcript}
"""

Return ONLY a JSON object with these fields (infer or leave null if not mentioned):
{
  "summary": "<2-3 sentence professional summary>",
  "current_role": "<job title>",
  "seniority": "<Fresher|Junior|Mid-level|Senior|Manager|Director|CXO|Founder|Student>",
  "years_experience": <number or null>,
  "industry": "<industry name>",
  "company_type": "<Startup|SME|MNC|Self-employed|Student>",
  "team_size": "<none|small (1-5)|medium (5-20)|large (20+)> (team they lead or work in)",
  "key_responsibilities": ["...", "..."],
  "who_they_speak_with": ["<audience 1>", "<audience 2>"],
  "communication_contexts": ["<context 1>", "<context 2>"],
  "self_mentioned_challenges": ["<challenge 1>"],
  "personal_style": "<how they describe their own communication>",
  "aspirations": ["<aspiration 1>"],
  "inferred_scenario_priorities": ["<scenario type 1>", "<scenario type 2>"],
  "evaluation_lens": "<1-2 sentences on how to evaluate this person — what standard should they be held to, what is most important for their role>"
}

Guidelines:
- For a CTO/Founder: prioritise board communication, investor pitches, executive presence, team leadership
- For a Senior Engineer: prioritise technical explanation to non-tech, cross-team collaboration, daily communication clarity
- For Sales: persuasion, objection handling, relationship-building language
- For BPO/Support: tone, empathy, clarity on calls
- Be specific and insightful. This shapes every evaluation and scenario the user gets.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  return JSON.parse(completion.choices[0].message.content || '{}')
}
