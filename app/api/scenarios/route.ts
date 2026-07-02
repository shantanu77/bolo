import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  const sql = category
    ? 'SELECT * FROM scenarios WHERE is_active = 1 AND category = ? ORDER BY sort_order'
    : 'SELECT * FROM scenarios WHERE is_active = 1 ORDER BY category, sort_order'

  const scenarios = await query(sql, category ? [category] : undefined)

  const mastery = await query<{ scenario_id: string; mastery_stars: number; best_score: number; attempt_count: number }>(
    'SELECT scenario_id, mastery_stars, best_score, attempt_count FROM scenario_mastery WHERE user_id = ?',
    [session.user.id]
  )
  const masteryMap = Object.fromEntries(mastery.map(m => [m.scenario_id, m]))

  const daily = await queryOne('SELECT id FROM scenarios WHERE is_daily = 1 AND daily_date = CURDATE()')

  const enriched = (scenarios as Array<Record<string, unknown>>).map(s => ({
    ...s,
    mastery_stars: masteryMap[s.id as string]?.mastery_stars ?? 0,
    best_score:    masteryMap[s.id as string]?.best_score ?? null,
    attempt_count: masteryMap[s.id as string]?.attempt_count ?? 0,
    is_today_daily: (daily as Record<string, unknown> | null)?.id === s.id,
  }))

  return NextResponse.json({ scenarios: enriched })
}
