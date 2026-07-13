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
  dimension_evidence: Record<string, {
    score: number
    verdict: string
    evidence: string[]
    impact: string
    fix: string
    rewritten_sentence?: string
    study_topic?: string
  }>
  overall:           number
  what_worked:       string
  improvement_focus: string
  model_response:    string
  voice_summary: {
    strengths: string
    priority_fix: string
    polished_version: string
    next_practice: string
  }
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
  userId?: string | null,
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

  const prompt = `You are AuraXpress, an English communication coach for Indian professionals.

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
- Support every dimension score with evidence from the user's transcript. Quote exact short phrases where possible.
- Make the evidence practical: what happened, why it affected the score, and what to do instead.
- For each dimension, include a rewritten_sentence whenever a better wording would help the user understand how they should have spoken.
- For vocabulary, do not only say "basic but adequate"; show a more natural rewritten sentence using stronger synonyms where appropriate, without making it sound artificial.
- For each dimension, include a study_topic that can become a short learning guide. Example: vocabulary issue around "good job" -> "Using specific adjectives when appreciating people".
- Surface one priority improvement area, but still explain each score.
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
  "dimension_evidence": {
    "clarity": {
      "score": <same as scores.clarity>,
      "verdict": "<short label such as 'Acceptable but needs sharper wording'>",
      "evidence": ["<exact phrase or short excerpt from the response>", "..."],
      "impact": "<what this did to clarity>",
      "fix": "<specific correction or technique>",
      "rewritten_sentence": "<one improved sentence showing exactly how they could say this, or empty string if not useful>",
      "study_topic": "<short teachable topic for this issue>"
    },
    "fluency": { "score": <same>, "verdict": "...", "evidence": ["..."], "impact": "...", "fix": "...", "rewritten_sentence": "...", "study_topic": "..." },
    "vocabulary": { "score": <same>, "verdict": "...", "evidence": ["..."], "impact": "...", "fix": "...", "rewritten_sentence": "...", "study_topic": "..." },
    "structure": { "score": <same>, "verdict": "...", "evidence": ["..."], "impact": "...", "fix": "...", "rewritten_sentence": "...", "study_topic": "..." },
    "confidence": { "score": <same>, "verdict": "...", "evidence": ["..."], "impact": "...", "fix": "...", "rewritten_sentence": "...", "study_topic": "..." },
    "tone_match": { "score": <same>, "verdict": "...", "evidence": ["..."], "impact": "...", "fix": "...", "rewritten_sentence": "...", "study_topic": "..." }
  },
  "what_worked": "<one specific positive observation referencing what they said>",
  "improvement_focus": "<the single most impactful thing to improve, quoting a specific phrase they used>",
  "model_response": "<a natural, confident version of what they were trying to say — tailored to their role and the scenario's register. 3-5 sentences. Sound like THEM, just more polished.>",
  "voice_summary": {
    "strengths": "<1 sentence naming the strongest part>",
    "priority_fix": "<1 sentence naming the highest priority correction with a quoted phrase>",
    "polished_version": "<1 sentence introducing the model_response>",
    "next_practice": "<1 sentence on what to practise next>"
  },
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
    userId,
    callType: 'evaluation',
    model:    'gpt-4o',
    promptTokens:     response.usage?.prompt_tokens     ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens:      response.usage?.total_tokens      ?? 0,
  })

  const raw = JSON.parse(response.choices[0].message.content || '{}') as EvaluationResult
  const s   = raw.scores
  raw.overall = Math.round((s.clarity + s.fluency + s.vocabulary + s.structure + s.confidence + s.tone_match) / 6 * 20)
  raw.dimension_evidence = normalizeEvidence(raw.dimension_evidence, s, raw.improvement_focus)
  raw.voice_summary = raw.voice_summary ?? {
    strengths: raw.what_worked,
    priority_fix: raw.improvement_focus,
    polished_version: 'Here is a clearer version of your response.',
    next_practice: raw.coach_note ?? 'Practise the same scenario again with a sharper structure.',
  }

  return raw
}

function normalizeEvidence(
  evidence: EvaluationResult['dimension_evidence'] | undefined,
  scores: EvaluationResult['scores'],
  fallback: string,
): EvaluationResult['dimension_evidence'] {
  const labels = Object.keys(scores) as Array<keyof EvaluationResult['scores']>
  return Object.fromEntries(labels.map(key => {
    const item = evidence?.[key]
    return [key, {
      score: scores[key],
      verdict: item?.verdict || 'Needs review',
      evidence: Array.isArray(item?.evidence) ? item.evidence.slice(0, 3).map(String).filter(Boolean) : [],
      impact: item?.impact || fallback,
      fix: item?.fix || 'Use shorter, more direct sentences and connect your points clearly.',
      rewritten_sentence: item?.rewritten_sentence || '',
      study_topic: item?.study_topic || `Improving ${String(key).replace('_', ' ')}`,
    }]
  }))
}

export async function generateTTS(text: string, _sessionId: string, attemptId: string, userId?: string | null): Promise<string> {
  const storagePath = path.join(process.cwd(), 'storage', 'tts')
  fs.mkdirSync(storagePath, { recursive: true })

  const filename = `${attemptId}.mp3`
  const filePath = path.join(storagePath, filename)

  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
  const voice = process.env.OPENAI_TTS_VOICE || 'marin'
  const instructions = process.env.OPENAI_TTS_INSTRUCTIONS
    || 'Speak in a warm, clear, natural Indian English accent. Sound like a supportive professional communication coach from India. Pronounce Indian names, cities, companies, and locations naturally and accurately. Keep the delivery confident, conversational, and easy to follow without exaggerating the accent.'

  const response = await openai.audio.speech.create({
    model,
    voice,
    input:  text,
    speed:  0.95,
    ...(model === 'tts-1' || model === 'tts-1-hd' ? {} : { instructions }),
  })

  const estimatedInputTokens = Math.ceil(text.length / 4)
  const estimatedAudioTokens = Math.ceil(text.split(/\s+/).filter(Boolean).length * 8)
  logUsage({
    userId,
    callType: 'tts',
    model,
    promptTokens: estimatedInputTokens,
    completionTokens: estimatedAudioTokens,
    totalTokens: estimatedInputTokens + estimatedAudioTokens,
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  return `/api/audio/tts/${filename}`
}
