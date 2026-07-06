import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { parseJsonArray, parseJsonObject } from '@/lib/json'
import OpenAI from 'openai'
import { logUsage } from '@/lib/usage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Message { role: 'user' | 'assistant'; content: string }

function safeList(val: unknown): string[] {
  return parseJsonArray(val).map(String)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const messages: Message[] = body.messages ?? []
  if (!messages.length) return NextResponse.json({ error: 'No messages' }, { status: 400 })

  // Fetch user context
  const [persona, recentAttempts, badges] = await Promise.all([
    queryOne<{
      job_role: string; seniority: string; industry: string
      interacts_with: string; challenges: string; goals: string
      bio_structured: string | null
    }>('SELECT * FROM personas WHERE user_id = ?', [session.user.id]),
    query<{ score_overall: number; score_clarity: number; score_fluency: number; score_structure: number; score_confidence: number; filler_word_count: number }>(
      'SELECT score_overall, score_clarity, score_fluency, score_structure, score_confidence, filler_word_count FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [session.user.id]
    ),
    query<{ name: string; icon: string }>(
      'SELECT b.name, b.icon FROM user_badges ub JOIN badges b ON b.slug = ub.badge_slug WHERE ub.user_id = ? LIMIT 5',
      [session.user.id]
    ),
  ])

  const bio = parseJsonObject(persona?.bio_structured)
  const avgScore = recentAttempts.length
    ? Math.round(recentAttempts.reduce((s, a) => s + a.score_overall, 0) / recentAttempts.length)
    : null
  const avgClarity    = recentAttempts.length ? Math.round(recentAttempts.reduce((s, a) => s + a.score_clarity, 0)    / recentAttempts.length) : null
  const avgFluency    = recentAttempts.length ? Math.round(recentAttempts.reduce((s, a) => s + a.score_fluency, 0)    / recentAttempts.length) : null
  const avgStructure  = recentAttempts.length ? Math.round(recentAttempts.reduce((s, a) => s + a.score_structure, 0)  / recentAttempts.length) : null
  const avgConfidence = recentAttempts.length ? Math.round(recentAttempts.reduce((s, a) => s + a.score_confidence, 0) / recentAttempts.length) : null
  const avgFillers    = recentAttempts.length ? (recentAttempts.reduce((s, a) => s + a.filler_word_count, 0) / recentAttempts.length).toFixed(1) : null

  const systemPrompt = `You are AuraXpress Coach — a friendly, practical English communication coach built specifically for Indian professionals. You are embedded inside the AuraXpress app.

Your role: answer questions about how to communicate better in English, give practical tips, coach the user on specific scenarios, and help them understand their practice data. You know this user personally.

USER PROFILE:
${bio?.summary ? `Summary: ${bio.summary}` : ''}
Role: ${bio?.current_role ?? persona?.job_role ?? 'Not set'}
Seniority: ${bio?.seniority ?? persona?.seniority ?? 'Not set'}
Industry: ${bio?.industry ?? persona?.industry ?? 'Not set'}
${bio?.who_they_speak_with ? `Speaks with: ${Array.isArray(bio.who_they_speak_with) ? bio.who_they_speak_with.join(', ') : bio.who_they_speak_with}` : ''}
${bio?.evaluation_lens ? `Evaluation context: ${bio.evaluation_lens}` : ''}
${persona?.challenges ? `Self-reported challenges: ${safeList(persona.challenges).join(', ')}` : ''}
${persona?.goals ? `Goals: ${safeList(persona.goals).join(', ')}` : ''}

THEIR RECENT PRACTICE DATA (last ${recentAttempts.length} sessions):
${avgScore ? `Average overall score: ${avgScore}/100` : 'No sessions yet.'}
${avgClarity    ? `Clarity avg: ${avgClarity}/5` : ''}
${avgFluency    ? `Fluency avg: ${avgFluency}/5` : ''}
${avgStructure  ? `Structure avg: ${avgStructure}/5` : ''}
${avgConfidence ? `Confidence avg: ${avgConfidence}/5` : ''}
${avgFillers    ? `Avg filler words per session: ${avgFillers}` : ''}
${badges.length ? `Badges earned: ${badges.map(b => `${b.icon} ${b.name}`).join(', ')}` : ''}

COACHING GUIDELINES:
- Be warm, direct, and practical. Never condescending.
- Tailor all advice to their specific role, seniority, and industry. A junior engineer needs different advice than a CTO.
- Reference their practice data when relevant — if their confidence scores are low, address that specifically.
- Give concrete, actionable tips — not generic "speak clearly" advice.
- Use Indian English examples and contexts. Do not use American or British workplace examples that would feel foreign.
- Keep responses concise — 3-5 sentences max unless they ask for more detail.
- If they ask you to demonstrate or roleplay, do it with realistic examples for their role.
- You can suggest which AuraXpress scenarios to practice based on their question.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
    ],
    temperature: 0.7,
    max_tokens: 400,
  })

  logUsage({
    userId: session.user.id,
    callType: 'coach_chat',
    model: 'gpt-4o',
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  })

  const reply = response.choices[0].message.content ?? 'Sorry, I could not generate a response. Please try again.'
  return NextResponse.json({ reply })
}
