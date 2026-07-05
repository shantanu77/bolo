import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, execute, queryOne } from '@/lib/db'
import { parseJsonArray, parseJsonObject } from '@/lib/json'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const forceRegenerate = body.force === true

  // Don't regenerate if already done (unless forced)
  if (!forceRegenerate) {
    const existing = await query(
      'SELECT id FROM user_categories WHERE user_id = ? LIMIT 1',
      [session.user.id]
    )
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Categories already generated', skipped: true })
    }
  } else {
    await execute('DELETE FROM user_scenarios WHERE user_id = ?', [session.user.id])
    await execute('DELETE FROM user_categories WHERE user_id = ?', [session.user.id])
  }

  const persona = await queryOne<{
    job_role: string; seniority: string; industry: string; company_size: string
    interacts_with: string; challenges: string; goals: string
    bio_structured: string | null
  }>('SELECT * FROM personas WHERE user_id = ?', [session.user.id])

  const bioStructured = parseJsonObject(persona?.bio_structured)

  const categories = await generateCategories(persona, bioStructured)

  // Save categories
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const catId = randomUUID()
    await execute(
      'INSERT INTO user_categories (id, user_id, name, description, icon, source, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [catId, session.user.id, cat.name, cat.description, cat.icon, 'ai_generated', i]
    )

    // Generate 3 scenarios per category
    const scenarios = await generateScenariosForCategory(cat, persona, bioStructured)
    for (let j = 0; j < scenarios.length; j++) {
      const sc = scenarios[j]
      await execute(
        `INSERT INTO user_scenarios (id, user_id, category_id, title, context, question, register, vocab_level,
         comm_goal, common_mistakes, ideal_wpm_min, ideal_wpm_max, source, sort_order)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_generated', ?)`,
        [
          session.user.id, catId, sc.title, sc.context, sc.question,
          sc.register, sc.vocab_level, sc.comm_goal,
          JSON.stringify(sc.common_mistakes ?? []),
          sc.ideal_wpm_min ?? 110, sc.ideal_wpm_max ?? 140, j,
        ]
      )
    }
  }

  const saved = await query(
    `SELECT uc.*, COUNT(us.id) as scenario_count
     FROM user_categories uc
     LEFT JOIN user_scenarios us ON us.category_id = uc.id
     WHERE uc.user_id = ? GROUP BY uc.id ORDER BY uc.sort_order`,
    [session.user.id]
  )

  return NextResponse.json({ categories: saved })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await query<{
    id: string; name: string; description: string; icon: string; source: string; sort_order: number
  }>(
    `SELECT uc.*, COUNT(us.id) as scenario_count
     FROM user_categories uc
     LEFT JOIN user_scenarios us ON us.category_id = uc.id AND us.is_active = 1
     WHERE uc.user_id = ? GROUP BY uc.id ORDER BY uc.sort_order`,
    [session.user.id]
  )

  return NextResponse.json({ categories })
}

async function generateCategories(
  persona: Record<string, unknown> | null,
  bio: Record<string, unknown> | null
) {
  const context = buildPersonaContext(persona, bio)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are designing a personalised English speaking practice curriculum for an Indian professional.

User profile:
${context}

Generate 5–6 scenario CATEGORIES that are most relevant for this specific person's communication needs.
These should be highly specific to their role — not generic.

For example:
- A software engineer → "Daily Standup & Sprint Ceremonies", "Explaining Technical Decisions", "Code Review Discussions"
- A CTO → "Board Presentations", "Investor Q&A", "All-Hands Town Halls", "Team Performance Conversations"
- A sales professional → "Discovery Calls", "Handling Pricing Objections", "Executive-Level Pitching"
- A founder → "Fundraising Pitches", "Customer Sales Conversations", "Hiring & Culture Talks"

Return a JSON array of category objects:
[
  {
    "name": "<category name>",
    "description": "<1 sentence on what this covers and why it matters for this person>",
    "icon": "<single emoji>",
    "register": "formal|semi_formal|casual",
    "priority": <1-5, 5 being most critical for this person>
  }
]

Order by priority descending. Be specific, not generic.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const parsed = JSON.parse(completion.choices[0].message.content || '{}')
  return (parsed.categories ?? parsed) as Array<{
    name: string; description: string; icon: string; register: string; priority: number
  }>
}

async function generateScenariosForCategory(
  category: { name: string; description: string; register: string },
  persona: Record<string, unknown> | null,
  bio: Record<string, unknown> | null
) {
  const context = buildPersonaContext(persona, bio)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are creating English speaking practice scenarios for an Indian professional.

User profile:
${context}

Category: "${category.name}"
Category description: ${category.description}
Register: ${category.register}

Generate exactly 3 realistic, specific practice scenarios for this category and this user.
Each scenario should feel like something this person genuinely encounters — not a generic example.

Return a JSON object with a "scenarios" array:
{
  "scenarios": [
    {
      "title": "<short scenario title>",
      "context": "<2-3 sentences setting the scene realistically — who is in the room, what is the situation>",
      "question": "<the specific question or prompt the user must respond to>",
      "register": "formal|semi_formal|casual",
      "vocab_level": "professional|general|conversational",
      "comm_goal": "clarity|persuasion|empathy|confidence|structure|tone",
      "common_mistakes": ["<mistake 1>", "<mistake 2>", "<mistake 3>"],
      "ideal_wpm_min": <number>,
      "ideal_wpm_max": <number>
    }
  ]
}

Make the scenarios progressively harder (scenario 1 = easier, scenario 3 = harder).
The questions should be things that genuinely challenge someone at this person's level.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  const parsed = JSON.parse(completion.choices[0].message.content || '{}')
  return (parsed.scenarios ?? []) as Array<{
    title: string; context: string; question: string; register: string
    vocab_level: string; comm_goal: string; common_mistakes: string[]
    ideal_wpm_min: number; ideal_wpm_max: number
  }>
}

function buildPersonaContext(persona: Record<string, unknown> | null, bio: Record<string, unknown> | null): string {
  const lines: string[] = []

  if (bio?.summary)                 lines.push(`Summary: ${bio.summary}`)
  if (bio?.current_role || persona?.job_role)
    lines.push(`Role: ${bio?.current_role ?? persona?.job_role}`)
  if (bio?.seniority || persona?.seniority)
    lines.push(`Seniority: ${bio?.seniority ?? persona?.seniority}`)
  if (bio?.years_experience)        lines.push(`Experience: ${bio.years_experience} years`)
  if (bio?.industry || persona?.industry)
    lines.push(`Industry: ${bio?.industry ?? persona?.industry}`)
  if (bio?.company_type || persona?.company_size)
    lines.push(`Company type: ${bio?.company_type ?? persona?.company_size}`)
  if (bio?.team_size)               lines.push(`Team size: ${bio.team_size}`)
  const responsibilities = bio?.key_responsibilities
  if (Array.isArray(responsibilities) && responsibilities.length)
    lines.push(`Key responsibilities: ${responsibilities.join(', ')}`)
  const speaksWith = bio?.who_they_speak_with
  if (Array.isArray(speaksWith) && speaksWith.length)
    lines.push(`Speaks with: ${speaksWith.join(', ')}`)
  const contexts = bio?.communication_contexts
  if (Array.isArray(contexts) && contexts.length)
    lines.push(`Communication contexts: ${contexts.join(', ')}`)
  if (bio?.evaluation_lens)         lines.push(`Evaluation note: ${bio.evaluation_lens}`)
  const challenges = parseJsonArray(persona?.challenges)
  if (challenges.length) lines.push(`Self-reported challenges: ${challenges.join(', ')}`)

  const goals = parseJsonArray(persona?.goals)
  if (goals.length) lines.push(`Goals: ${goals.join(', ')}`)

  return lines.join('\n')
}
