import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute, queryOne, query } from '@/lib/db'
import { parseJsonArray, parseJsonObject } from '@/lib/json'
import { evaluateResponse, generateTTS } from '@/lib/openai'
import { processSessionXp, scoreToStars } from '@/lib/gamification'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sessionId, transcript, fillerWords = {}, wpm = 120, durationSec = 0 } = body

  if (!sessionId || !transcript) {
    return NextResponse.json({ error: 'sessionId and transcript required' }, { status: 400 })
  }

  const practiceSession = await queryOne<{ id: string; scenario_id: string; attempt_count: number }>(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    [sessionId, session.user.id]
  )
  if (!practiceSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Try global scenarios first, then user scenarios
  let scenario = await queryOne<{
    id: string; category: string; context: string; question: string;
    register: string; comm_goal: string; ideal_wpm_min: number; ideal_wpm_max: number; is_daily: number
  }>('SELECT * FROM scenarios WHERE id = ?', [practiceSession.scenario_id])

  const isUserScenario = !scenario
  if (isUserScenario) {
    scenario = await queryOne(
      'SELECT *, "user_created" as category, 0 as is_daily FROM user_scenarios WHERE id = ? AND user_id = ?',
      [practiceSession.scenario_id, session.user.id]
    )
  }

  const persona = await queryOne<{
    native_language: string; job_role: string; seniority: string;
    industry: string; interacts_with: string; challenges: string
    bio_structured: string | null
  }>('SELECT * FROM personas WHERE user_id = ?', [session.user.id])

  const parsedPersona = persona ? {
    native_language: persona.native_language,
    job_role:        persona.job_role,
    seniority:       persona.seniority,
    industry:        persona.industry,
    interacts_with:  parseJsonArray(persona.interacts_with).map(String),
    challenges:      parseJsonArray(persona.challenges).map(String),
    bio_structured:  parseJsonObject(persona.bio_structured),
  } : null

  const evaluation = await evaluateResponse(transcript, fillerWords, wpm, scenario!, parsedPersona)

  const attemptId = randomUUID()
  const fillerCount = Object.values(fillerWords).reduce((a: number, b) => a + (b as number), 0)

  const ttsText = [
    evaluation.voice_summary?.strengths ?? evaluation.what_worked,
    evaluation.voice_summary?.priority_fix ?? `One thing to work on: ${evaluation.improvement_focus}`,
    evaluation.voice_summary?.polished_version ?? 'Here is how you could have said that:',
    evaluation.model_response,
    evaluation.voice_summary?.next_practice ?? evaluation.coach_note ?? '',
  ].filter(Boolean).join(' ')

  const [ttsPath, ,] = await Promise.all([
    generateTTS(ttsText, sessionId, attemptId),
    execute(
      `INSERT INTO attempts (id, session_id, user_id, transcript, duration_sec, words_per_minute,
       filler_word_count, filler_words, score_clarity, score_fluency, score_vocabulary,
       score_structure, score_confidence, score_tone, score_overall, feedback_text, model_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId, sessionId, session.user.id, transcript, durationSec, wpm,
        fillerCount, JSON.stringify(fillerWords),
        evaluation.scores.clarity, evaluation.scores.fluency, evaluation.scores.vocabulary,
        evaluation.scores.structure, evaluation.scores.confidence, evaluation.scores.tone_match,
        evaluation.overall, evaluation.improvement_focus, evaluation.model_response,
      ]
    ),
    execute(
      'UPDATE sessions SET attempt_count = attempt_count + 1, last_score = ?, ended_at = NOW() WHERE id = ?',
      [evaluation.overall, sessionId]
    ),
  ])

  await execute('UPDATE attempts SET tts_audio_path = ? WHERE id = ?', [ttsPath, attemptId])

  const masteryTable = isUserScenario ? 'user_scenario_mastery' : 'scenario_mastery'
  const mastery = await queryOne<{ best_score: number; attempt_count: number }>(
    `SELECT best_score, attempt_count FROM ${masteryTable} WHERE user_id = ? AND scenario_id = ?`,
    [session.user.id, scenario!.id]
  )
  const isPersonalBest = !mastery || evaluation.overall > (mastery.best_score ?? 0)
  const newStars = scoreToStars(evaluation.overall)

  if (mastery) {
    await execute(
      `UPDATE ${masteryTable} SET attempt_count = attempt_count + 1, last_played = NOW(),
       best_score = GREATEST(best_score, ?), mastery_stars = GREATEST(mastery_stars, ?) WHERE user_id = ? AND scenario_id = ?`,
      [evaluation.overall, newStars, session.user.id, scenario!.id]
    )
  } else {
    await execute(
      `INSERT INTO ${masteryTable} (id, user_id, scenario_id, best_score, attempt_count, mastery_stars, last_played) VALUES (UUID(), ?, ?, ?, 1, ?, NOW())`,
      [session.user.id, scenario!.id, evaluation.overall, newStars]
    )
  }

  const [{ total_attempts }] = await query<{ total_attempts: number }>(
    'SELECT COUNT(*) as total_attempts FROM attempts WHERE user_id = ?',
    [session.user.id]
  )

  const xpResult = await processSessionXp(
    session.user.id,
    evaluation.overall,
    total_attempts === 1,
    !mastery,
    isPersonalBest,
    scenario!.is_daily === 1,
    fillerCount,
  )

  await execute('UPDATE attempts SET xp_earned = ? WHERE id = ?', [xpResult.xpEarned, attemptId])

  return NextResponse.json({
    attemptId,
    evaluation,
    ttsAudioUrl: ttsPath,
    xp: xpResult,
    isPersonalBest,
    mastery_stars: newStars,
  })
}
