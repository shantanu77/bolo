import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { authOptions } from '@/lib/auth'
import { saveLearningGuide } from '@/lib/learning-guides'
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

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Create a practical AI study guide for an Indian professional improving spoken English.

Dimension: ${dimension}
Study topic: ${topic}
Scenario question: ${scenarioQuestion || 'Not provided'}
What the user said: ${evidence.length ? evidence.map(item => `"${item}"`).join(', ') : 'Not provided'}
Coach verdict: ${verdict || 'Not provided'}
Why it matters: ${impact || 'Not provided'}
Immediate fix: ${fix || 'Not provided'}
Better sentence: ${rewrittenSentence || 'Not provided'}

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

Make the guide specific enough to act on, but generic enough that the user can reuse it in future conversations. If the topic is vocabulary, teach better word choice and synonyms in context rather than listing random synonyms.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  logUsage({
    userId: session.user.id,
    callType: 'study_guide',
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
