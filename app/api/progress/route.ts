import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { getLevelForXp } from '@/lib/levels'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = session.user.id

  const [user, attempts, badges, scenarioMastery, monthlyXp] = await Promise.all([
    queryOne<{ xp: number; level: number; streak_days: number; last_practiced: string }>(
      'SELECT xp, level, streak_days, last_practiced FROM users WHERE id = ?', [uid]
    ),
    query<{
      created_at: string; score_overall: number; score_clarity: number; score_fluency: number;
      score_vocabulary: number; score_structure: number; score_confidence: number; score_tone: number;
      filler_word_count: number; words_per_minute: number; xp_earned: number;
    }>(
      `SELECT created_at, score_overall, score_clarity, score_fluency, score_vocabulary,
       score_structure, score_confidence, score_tone, filler_word_count, words_per_minute, xp_earned
       FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [uid]
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
    attempts:       attempts.slice(0, 20),
    totalSessions:  attempts.length,
    dimensionAvg,
    badges,
    scenarioMastery,
    monthlyXp,
  })
}
