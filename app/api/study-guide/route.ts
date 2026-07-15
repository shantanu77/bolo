import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { getExistingLearningGuideForSource, saveLearningGuide } from '@/lib/learning-guides'
import { logUsage } from '@/lib/usage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const dimension = clean(body.dimension) || 'Communication'
  const topic = clean(body.topic) || `Improving ${dimension}`
  const verdict = clean(body.verdict)
  const impact = clean(body.impact)
  const fix = clean(body.fix)
  const rewrittenSentence = clean(body.rewritten_sentence)
  const evidence: string[] = Array.isArray(body.evidence) ? body.evidence.map(clean).filter(Boolean).slice(0, 4) : []
  const scenarioQuestion = clean(body.scenario_question)
  const scenarioId = clean(body.scenario_id, 36)
  const scenarioType = ['global', 'user'].includes(body.scenario_type) ? body.scenario_type : 'global'
  const planMode = body.plan_mode === true
  const performanceContext = body.performance_context && typeof body.performance_context === 'object'
    ? JSON.stringify(body.performance_context).slice(0, 1200)
    : ''

  if (scenarioId) {
    const existingGuide = await getExistingLearningGuideForSource({
      userId: session.user.id,
      scenarioId,
      scenarioType,
      dimension,
    })

    if (existingGuide) {
      return NextResponse.json({
        guide: existingGuide.guide_json,
        savedGuide: { id: existingGuide.id },
        reused: true,
      })
    }
  }

  const persona = planMode
    ? await queryOne<{
        job_role: string | null
        seniority: string | null
        industry: string | null
        challenges: unknown
        goals: unknown
      }>('SELECT job_role, seniority, industry, challenges, goals FROM personas WHERE user_id = ?', [session.user.id])
    : null

  const profileContext = persona
    ? `Role: ${persona.job_role || 'Not set'}\nSeniority: ${persona.seniority || 'Not set'}\nIndustry: ${persona.industry || 'Not set'}\nChallenges: ${safeJson(persona.challenges)}\nGoals: ${safeJson(persona.goals)}`
    : 'Profile details are not available.'

  const taskPrompt = planMode
    ? `Create a personalized 7-day spoken-English improvement plan for an Indian professional.

Focus dimension: ${dimension}
Performance summary: ${verdict || 'Not provided'}
Score history: ${performanceContext || 'Not provided'}
User profile:
${profileContext}

The plan must focus tightly on ${dimension}. Give short daily exercises that can be completed in 10-15 minutes, workplace-specific examples, a measurable target, and a final review task. Use the lesson headings "Days 1-2: Diagnose and learn", "Days 3-5: Deliberate practice", and "Days 6-7: Apply and measure". Make each lesson body state the exact activity, repetition count or duration, and success measure.`
    : `Create a practical AI study guide for an Indian professional improving spoken English.

Dimension: ${dimension}
Study topic: ${topic}
Scenario question: ${scenarioQuestion || 'Not provided'}
What the user said: ${evidence.length ? evidence.map(item => `"${item}"`).join(', ') : 'Not provided'}
Coach verdict: ${verdict || 'Not provided'}
Why it matters: ${impact || 'Not provided'}
Immediate fix: ${fix || 'Not provided'}
Better sentence: ${rewrittenSentence || 'Not provided'}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `${taskPrompt}

Return ONLY a JSON object:
{
  "title": "<clear lesson title>",
  "objective": "<1 sentence explaining what the user will learn>",
  "lesson": [
    { "heading": "<short heading>", "body": "<2-3 practical sentences>" },
    { "heading": "<short heading>", "body": "<2-3 practical sentences>" },
    { "heading": "<short heading>", "body": "<2-3 practical sentences>" }
  ],
  "examples": [
    { "weak": "<weak phrase or sentence>", "better": "<improved spoken sentence>", "why": "<short reason>" },
    { "weak": "<weak phrase or sentence>", "better": "<improved spoken sentence>", "why": "<short reason>" }
  ],
  "quick_rule": "<one memorable rule>",
  "review_question": {
    "prompt": "<a sample spoken-practice question based on this guide>",
    "expected_points": ["<point 1>", "<point 2>", "<point 3>"]
  }
}

${planMode
  ? `Make this a concrete plan, not a general lesson. The title must include "7-Day" and the ${dimension} focus. Put the measurable end-of-week target in objective and quick_rule.`
  : 'Make the guide specific enough to act on, but generic enough that the user can reuse it in future conversations. If the topic is vocabulary, teach better word choice and synonyms in context rather than listing random synonyms.'}`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  logUsage({
    userId: session.user.id,
    callType: planMode ? 'improvement_plan' : 'study_guide',
    model: 'gpt-4o',
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
  })

  const guide = JSON.parse(completion.choices[0].message.content || '{}')
  const guideId = await saveLearningGuide({
    userId: session.user.id,
    dimension,
    topic,
    scenarioId,
    scenarioType,
    scenarioQuestion,
    evidence,
    guide,
  })

  return NextResponse.json({ guide, savedGuide: { id: guideId } })
}

function clean(value: unknown, maxLength = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function safeJson(value: unknown) {
  if (value == null) return 'Not set'
  if (typeof value === 'string') return value.slice(0, 500)
  try {
    return JSON.stringify(value).slice(0, 500)
  } catch {
    return 'Not set'
  }
}
