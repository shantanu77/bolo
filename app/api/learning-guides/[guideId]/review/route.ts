import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { authOptions } from '@/lib/auth'
import { getLearningGuide } from '@/lib/learning-guides'
import { logUsage } from '@/lib/usage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ReviewQuestion {
  id: string
  prompt: string
  focus: string
  expected_points: string[]
}

export async function POST(req: NextRequest, { params }: { params: { guideId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guide = await getLearningGuide(session.user.id, params.guideId)
  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const action = body.action === 'evaluate' ? 'evaluate' : 'generate'
  const guideContext = JSON.stringify({
    title: guide.guide_json.title,
    dimension: guide.dimension,
    objective: guide.guide_json.objective,
    lesson: guide.guide_json.lesson,
    examples: guide.guide_json.examples,
    quick_rule: guide.guide_json.quick_rule,
  }).slice(0, 14000)

  if (action === 'generate') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Create exactly 3 fresh spoken review questions from this AuraXpress learning guide.

GUIDE:
${guideContext}

The questions must test three different skills:
1. Explain or recall the core lesson in the user's own words.
2. Apply the lesson to a realistic Indian workplace situation.
3. Improve, correct, or demonstrate a weak communication example.

Each question must be answerable aloud in 30-90 seconds. Keep the language clear and conversational. Do not reveal a model answer in the prompt.

Return ONLY JSON:
{
  "questions": [
    { "id": "q1", "prompt": "<question>", "focus": "<skill being tested>", "expected_points": ["<point 1>", "<point 2>", "<point 3>"] },
    { "id": "q2", "prompt": "<question>", "focus": "<skill being tested>", "expected_points": ["<point 1>", "<point 2>", "<point 3>"] },
    { "id": "q3", "prompt": "<question>", "focus": "<skill being tested>", "expected_points": ["<point 1>", "<point 2>", "<point 3>"] }
  ]
}`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 900,
    })

    logUsage({
      userId: session.user.id,
      callType: 'learning_review_questions',
      model: 'gpt-4o',
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')
    const questions = normalizeQuestions(parsed.questions)
    if (questions.length !== 3) return NextResponse.json({ error: 'Could not create review questions.' }, { status: 502 })
    return NextResponse.json({ questions })
  }

  const question = clean(body.question, 1200)
  const transcript = clean(body.transcript, 8000)
  const expectedPoints = Array.isArray(body.expected_points)
    ? body.expected_points.map((point: unknown) => clean(point, 400)).filter(Boolean).slice(0, 5)
    : []
  const wpm = Math.max(0, Number(body.wpm) || 0)
  const fillerWords = body.filler_words && typeof body.filler_words === 'object' ? body.filler_words : {}

  if (!question || !transcript) {
    return NextResponse.json({ error: 'Question and transcript are required.' }, { status: 400 })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Evaluate a spoken answer to an AuraXpress learning-guide review question.

LEARNING GUIDE:
${guideContext}

QUESTION: ${question}
EXPECTED POINTS: ${JSON.stringify(expectedPoints)}
TRANSCRIPT:
"""
${transcript}
"""
SPEECH METRICS: ${Math.round(wpm)} words per minute; filler words ${JSON.stringify(fillerWords)}

Score the answer based on what was actually said. Content accuracy and use of the guide matter most. Do not invent audio qualities that cannot be inferred from the transcript and metrics. Give concise, encouraging, specific feedback and quote the answer where useful.

Return ONLY JSON:
{
  "scores": {
    "content_accuracy": <1-5, decimals allowed>,
    "relevance": <1-5, decimals allowed>,
    "structure": <1-5, decimals allowed>,
    "communication": <1-5, decimals allowed>
  },
  "what_worked": "<specific strength>",
  "improvement": "<single most important improvement>",
  "missed_points": ["<important expected point that was missed>"],
  "model_answer": "<clear natural answer in 3-6 sentences>",
  "rating_label": "<Needs practice|Developing|Good|Excellent>"
}`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.25,
    max_tokens: 900,
  })

  logUsage({
    userId: session.user.id,
    callType: 'learning_review_evaluation',
    model: 'gpt-4o',
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
  })

  const evaluation = normalizeEvaluation(JSON.parse(completion.choices[0].message.content || '{}'))
  return NextResponse.json({ evaluation })
}

function normalizeQuestions(value: unknown): ReviewQuestion[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).map((item, index) => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const points = Array.isArray(source.expected_points)
      ? source.expected_points.map(point => clean(point, 400)).filter(Boolean).slice(0, 4)
      : []
    return {
      id: `q${index + 1}`,
      prompt: clean(source.prompt, 1200),
      focus: clean(source.focus, 200) || `Review skill ${index + 1}`,
      expected_points: points,
    }
  }).filter(question => question.prompt && question.expected_points.length)
}

function normalizeEvaluation(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const rawScores = source.scores && typeof source.scores === 'object' ? source.scores as Record<string, unknown> : {}
  const scores = {
    content_accuracy: score(rawScores.content_accuracy),
    relevance: score(rawScores.relevance),
    structure: score(rawScores.structure),
    communication: score(rawScores.communication),
  }
  const overall = Math.round((Object.values(scores).reduce((sum, item) => sum + item, 0) / 4) * 20 * 100) / 100
  return {
    scores,
    overall,
    rating_label: clean(source.rating_label, 80) || (overall >= 80 ? 'Excellent' : overall >= 65 ? 'Good' : overall >= 45 ? 'Developing' : 'Needs practice'),
    what_worked: clean(source.what_worked, 1200),
    improvement: clean(source.improvement, 1200),
    missed_points: Array.isArray(source.missed_points) ? source.missed_points.map(point => clean(point, 400)).filter(Boolean).slice(0, 4) : [],
    model_answer: clean(source.model_answer, 2400),
  }
}

function score(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 1
  return Math.round(Math.max(1, Math.min(5, numeric)) * 100) / 100
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}
