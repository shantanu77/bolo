import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('category_id')

  const sql = categoryId
    ? `SELECT us.*, usm.mastery_stars, usm.best_score, usm.attempt_count
       FROM user_scenarios us
       LEFT JOIN user_scenario_mastery usm ON usm.scenario_id = us.id AND usm.user_id = us.user_id
       WHERE us.user_id = ? AND us.category_id = ? AND us.is_active = 1
       ORDER BY us.sort_order`
    : `SELECT us.*, usm.mastery_stars, usm.best_score, usm.attempt_count
       FROM user_scenarios us
       LEFT JOIN user_scenario_mastery usm ON usm.scenario_id = us.id AND usm.user_id = us.user_id
       WHERE us.user_id = ? AND us.is_active = 1
       ORDER BY us.sort_order`

  const params = categoryId ? [session.user.id, categoryId] : [session.user.id]
  const scenarios = await query(sql, params)

  return NextResponse.json({ scenarios })
}
