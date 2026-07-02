import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { logUsage } from './usage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface EvaluationResult {
  scores: {
    clarity:     number
    fluency:     number
    vocabulary:  number
    structure:   number
    confidence:  number
    tone_match:  number
  }
  overall:           number
  what_worked:       string
  improvement_focus: string
  model_response:    string
  coach_note?:       string
}

export interface ScenarioContext {
  category:      string
  context:       string
  question:      string
  register:      string
  comm_goal:     string
  ideal_wpm_min: number
  ideal_wpm_max: number
}

export interface PersonaContext {
  native_language: string
  job_role:        string
  seniority:       string
  industry:        string
  interacts_with:  string[]
  challenges:      string[]
  bio_structured?: Record<string, unknown> | null
}

export async function evaluateResponse(
  transcript: string,
  fillerWords: Record<string, number>,
  wpm: number,
  scenario: ScenarioContext,
  persona: PersonaContext | null,
): Promise<EvaluationResult> {
  const fillerTotal = Object.values(fillerWords).reduce((a, b) => a + b, 0)
  const wordCount   = transcript.split(' ').filter(Boolean).length
  const fillerRate  = wordCount > 0 ? (fillerTotal / wordCount) * 100 : 0

  const bio = persona?.bio_structured

  // Build a rich, layered persona description
  const personaLines: string[] = []
  if (bio?.summary)            personaLines.push(`Professional summary: ${bio.summary}`)
  if (bio?.current_role || persona?.job_role)
    personaLines.push(`Role: ${bio?.current_role ?? persona?.job_role}`)
  if (bio?.seniority || persona?.seniority)
    personaLines.push(`Seniority: ${bio?.seniority ?? persona?.seniority}`)
  if (bio?.years_experience)   personaLines.push(`Experience: ${bio.years_experience} years`)
  if (bio?.industry || persona?.industry)
    personaLines.push(`Industry: ${bio?.industry ?? persona?.industry}`)
  if (bio?.company_type)       personaLines.push(`Company type: ${bio.company_type}`)
  if (bio?.team_size)          personaLines.push(`Team size: ${bio.team_size}`)
  const speaksWith = bio?.who_they_speak_with
  if (Array.isArray(speaksWith) && speaksWith.length)
    personaLines.push(`Speaks with: ${speaksWith.join(', ')}`)
  const contexts = bio?.communication_contexts
  if (Array.isArray(contexts) && contexts.length)
    personaLines.push(`Communication contexts: ${contexts.join(', ')}`)
  if (bio?.evaluation_lens)    personaLines.push(`Evaluation standard: ${bio.evaluation_lens}`)
  if (persona?.challenges?.length)
    personaLines.push(`Self-reported challenges: ${persona.challenges.join(', ')}`)
  if (persona?.native_language)
    personaLines.push(`Native language: ${persona.native_language}`)

  const personaStr = personaLines.length > 0 ? personaLines.join('\n') : 'Profile not yet set.'

  const prompt = `You are Bolo, an English communication coach for Indian professionals.

USER PROFILE:
${personaStr}

SCENARIO BEING PRACTISED:
- Category: ${scenario.category}
- Context: ${scenario.context}
- Question asked: ${scenario.question}
- Expected register: ${scenario.register}
- Communication goal: ${scenario.comm_goal}

SPEECH METRICS:
- Words per minute: ${Math.round(wpm)} (ideal for this scenario: ${scenario.ideal_wpm_min}–${scenario.ideal_wpm_max})
- Filler words detected: ${JSON.stringify(fillerWords)} (${fillerRate.toFixed(1)} per 100 words)
- Total word count: ${wordCount}

USER'S RESPONSE:
"""
${transcript}
"""

EVALUATION INSTRUCTIONS:
- Calibrate your standards to this person's role and seniority. A CTO speaking to a board is held to a higher executive-presence bar than a junior engineer on a standup.
- Focus feedback on what matters MOST for their specific communication context.
- Do not penalise valid Indian English. Flag only what reduces clarity or is out of register.
- Be encouraging and specific. Reference exact phrases from their response.
- Surface AT MOST 1 improvement area. Never overwhelm.
- The model_response must sound like a confident Indian professional at THEIR level — not a generic Western speaker.

Return ONLY a JSON object:
{
  "scores": {
    "clarity": <1-5>,
    "fluency": <1-5>,
    "vocabulary": <1-5>,
    "structure": <1-5>,
    "confidence": <1-5>,
    "tone_match": <1-5>
  },
  "what_worked": "<one specific positive observation referencing what they said>",
  "improvement_focus": "<the single most impactful thing to improve, quoting a specific phrase they used>",
  "model_response": "<a natural, confident version of what they were trying to say — tailored to their role and the scenario's register. 3-5 sentences. Sound like THEM, just more polished.>",
  "coach_note": "<optional 1-sentence tip — only if strongly relevant. Omit if nothing extra to add.>"
}

Scoring guide: 1=poor, 2=needs work, 3=acceptable, 4=good, 5=excellent. Most responses score 2-4. Reserve 5 for genuinely impressive delivery.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  logUsage({
    callType: 'evaluation',
    model:    'gpt-4o',
    promptTokens:     response.usage?.prompt_tokens     ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens:      response.usage?.total_tokens      ?? 0,
  })

  const raw = JSON.parse(response.choices[0].message.content || '{}') as EvaluationResult
  const s   = raw.scores
  raw.overall = Math.round((s.clarity + s.fluency + s.vocabulary + s.structure + s.confidence + s.tone_match) / 6 * 20)

  return raw
}

export async function generateTTS(text: string, _sessionId: string, attemptId: string): Promise<string> {
  const storagePath = path.join(process.cwd(), 'storage', 'tts')
  fs.mkdirSync(storagePath, { recursive: true })

  const filename = `${attemptId}.mp3`
  const filePath = path.join(storagePath, filename)

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input:  text,
    speed:  0.95,
  })

  logUsage({ callType: 'tts', model: 'tts-1', units: text.length })

  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  return `/api/audio/tts/${filename}`
}
