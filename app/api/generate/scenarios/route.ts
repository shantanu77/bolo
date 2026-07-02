import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, execute, queryOne } from '@/lib/db'
import OpenAI from 'openai'
import { DeepgramClient } from '@deepgram/sdk'
import { Readable } from 'stream'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface DgResponse { results?: { channels?: Array<{ alternatives?: Array<{ transcript: string }> }> } }

// POST with audio: user speaks a new category request → transcribe → generate category + scenarios
// POST with text: user types a category request → generate directly
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') ?? ''
  let userRequest = ''

  if (contentType.includes('audio') || contentType.includes('octet-stream')) {
    // Voice input — transcribe first
    const body  = await req.arrayBuffer()
    const audio = Buffer.from(body)

    const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! })
    const dgResponse = await deepgram.listen.v1.media.transcribeFile(
      Readable.from(audio),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { model: 'nova-2', language: 'en-IN', smart_format: true, punctuate: true } as any
    )
    const dgData = dgResponse as unknown as DgResponse
    userRequest  = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  } else {
    const body = await req.json()
    userRequest = body.request ?? ''
  }

  if (!userRequest || userRequest.length < 5) {
    return NextResponse.json({ error: 'Request too short' }, { status: 422 })
  }

  const persona = await queryOne<{
    job_role: string; seniority: string; industry: string
    interacts_with: string; bio_structured: string | null
  }>('SELECT * FROM personas WHERE user_id = ?', [session.user.id])

  const bioStructured = persona?.bio_structured ? JSON.parse(persona.bio_structured) : null

  // Generate category + scenarios from the user request
  const result = await generateFromRequest(userRequest, persona, bioStructured)

  // Save category
  const catId = crypto.randomUUID()
  await execute(
    'INSERT INTO user_categories (id, user_id, name, description, icon, source, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [catId, session.user.id, result.category.name, result.category.description, result.category.icon, 'user_requested',
     await getNextSortOrder(session.user.id)]
  )

  // Save scenarios
  for (let i = 0; i < result.scenarios.length; i++) {
    const sc = result.scenarios[i]
    await execute(
      `INSERT INTO user_scenarios (id, user_id, category_id, title, context, question, register, vocab_level,
       comm_goal, common_mistakes, ideal_wpm_min, ideal_wpm_max, source, sort_order)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user_requested', ?)`,
      [
        session.user.id, catId, sc.title, sc.context, sc.question,
        sc.register, sc.vocab_level, sc.comm_goal,
        JSON.stringify(sc.common_mistakes ?? []),
        sc.ideal_wpm_min ?? 110, sc.ideal_wpm_max ?? 140, i,
      ]
    )
  }

  const scenarios = await query(
    'SELECT * FROM user_scenarios WHERE category_id = ? ORDER BY sort_order',
    [catId]
  )

  return NextResponse.json({
    userRequest,
    category:  { id: catId, ...result.category },
    scenarios,
  })
}

async function getNextSortOrder(userId: string): Promise<number> {
  const res = await query<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM user_categories WHERE user_id = ?', [userId]
  )
  return (res[0]?.max_order ?? -1) + 1
}

async function generateFromRequest(
  userRequest: string,
  persona: Record<string, unknown> | null,
  bio: Record<string, unknown> | null
) {
  const personaCtx = [
    bio?.summary              && `Role summary: ${bio.summary}`,
    (bio?.current_role || persona?.job_role) && `Role: ${bio?.current_role ?? persona?.job_role}`,
    (bio?.seniority || persona?.seniority)   && `Seniority: ${bio?.seniority ?? persona?.seniority}`,
    bio?.industry             && `Industry: ${bio.industry}`,
  ].filter(Boolean).join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are creating custom English speaking practice scenarios for an Indian professional.

User profile:
${personaCtx || 'Profile not yet set.'}

The user has requested this type of practice:
"${userRequest}"

First, distil this into a clean category name and description.
Then create 3–4 specific, realistic scenarios tailored to this user's level and context.

Return a JSON object:
{
  "category": {
    "name": "<clean category name>",
    "description": "<1 sentence description>",
    "icon": "<single emoji>"
  },
  "scenarios": [
    {
      "title": "<scenario title>",
      "context": "<2-3 sentences setting the scene>",
      "question": "<the specific prompt or question to respond to>",
      "register": "formal|semi_formal|casual",
      "vocab_level": "professional|general|conversational",
      "comm_goal": "clarity|persuasion|empathy|confidence|structure|tone",
      "common_mistakes": ["<mistake 1>", "<mistake 2>"],
      "ideal_wpm_min": <number>,
      "ideal_wpm_max": <number>
    }
  ]
}

Make scenarios progressively challenging. Tailor to the user's seniority and industry.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  return JSON.parse(completion.choices[0].message.content || '{}') as {
    category: { name: string; description: string; icon: string }
    scenarios: Array<{
      title: string; context: string; question: string; register: string
      vocab_level: string; comm_goal: string; common_mistakes: string[]
      ideal_wpm_min: number; ideal_wpm_max: number
    }>
  }
}
