import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { getLevelForXp } from '@/lib/levels'
import { parseJsonObject } from '@/lib/json'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = session.user.id

  const [user, attempts, badges, scenarioMastery, monthlyXp] = await Promise.all([
    queryOne<{ xp: number; level: number; streak_days: number; last_practiced: string }>(
      'SELECT xp, level, streak_days, last_practiced FROM users WHERE id = ?', [uid]
    ),
    query<{
      id: string; session_id: string; transcript: string | null; duration_sec: number | null
      feedback_text: string | null; model_response: string | null; tts_audio_path: string | null
      evaluation_json: unknown; scenario_title: string | null; scenario_category: string | null
      created_at: string; score_overall: number; score_clarity: number; score_fluency: number;
      score_vocabulary: number; score_structure: number; score_confidence: number; score_tone: number;
      filler_word_count: number; words_per_minute: number; xp_earned: number;
    }>(
      `SELECT a.id, a.session_id, a.created_at, a.transcript, a.duration_sec,
       a.score_overall, a.score_clarity, a.score_fluency, a.score_vocabulary,
       a.score_structure, a.score_confidence, a.score_tone, a.filler_word_count,
       a.words_per_minute, a.xp_earned, a.feedback_text, a.model_response,
       a.tts_audio_path, a.evaluation_json,
       COALESCE(s.title, us.title) as scenario_title,
       COALESCE(s.category, uc.name, 'Custom scenario') as scenario_category
       FROM attempts a
       JOIN sessions sess ON sess.id = a.session_id
       LEFT JOIN scenarios s ON s.id = sess.scenario_id
       LEFT JOIN user_scenarios us ON us.id = sess.scenario_id AND us.user_id = a.user_id
       LEFT JOIN user_categories uc ON uc.id = us.category_id
       WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 50`, [uid]
    ),
    query<{ badge_slug: string; earned_at: string; name: string; icon: string; description: string }>(
      `SELECT ub.badge_slug, ub.earned_at, b.name, b.icon, b.description
       FROM user_badges ub JOIN badges b ON b.slug = ub.badge_slug
       WHERE ub.user_id = ? ORDER BY ub.earned_at DESC`, [uid]
    ),
    query<{ scenario_id: string; mastery_stars: number; best_score: number; attempt_count: number; title: string; category: string }>(
      `SELECT sm.scenario_id, sm.mastery_stars, sm.best_score, sm.attempt_count, s.title, s.category
       FROM scenario_mastery sm JOIN scenarios s ON s.id = sm.scenario_id
       WHERE sm.user_id = ? ORDER BY sm.last_played DESC`, [uid]
    ),
    query<{ month_year: string; xp: number }>(
      'SELECT month_year, xp FROM monthly_xp WHERE user_id = ? ORDER BY month_year DESC LIMIT 6', [uid]
    ),
  ])

  const levelInfo = getLevelForXp(user?.xp ?? 0)

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const dimensionAvg = {
    clarity:    avg(attempts.map(a => a.score_clarity)),
    fluency:    avg(attempts.map(a => a.score_fluency)),
    vocabulary: avg(attempts.map(a => a.score_vocabulary)),
    structure:  avg(attempts.map(a => a.score_structure)),
    confidence: avg(attempts.map(a => a.score_confidence)),
    tone_match: avg(attempts.map(a => a.score_tone)),
  }

  return NextResponse.json({
    user: {
      xp:          user?.xp ?? 0,
      level:       levelInfo.current,
      nextLevel:   levelInfo.next,
      streak_days: user?.streak_days ?? 0,
    },
    attempts:       attempts.slice(0, 20).map(a => ({ ...a, evaluation_json: parseJsonObject(a.evaluation_json) })),
    totalSessions:  attempts.length,
    dimensionAvg,
    badges,
    scenarioMastery,
    monthlyXp,
  })
}
