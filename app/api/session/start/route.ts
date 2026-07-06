import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { ensureUserAdminColumns } from '@/lib/admin'
import { randomUUID } from 'crypto'

const TRIAL_DAILY_SESSION_LIMIT = 2

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUserAdminColumns()

  const user = await queryOne<{
    subscription_tier: string
    subscription_ends: string | null
    account_status: string
  }>(
    'SELECT subscription_tier, subscription_ends, account_status FROM users WHERE id = ?',
    [session.user.id]
  )

  if (user?.account_status === 'suspended') {
    return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 })
  }

  const trialEnds = user?.subscription_ends ? new Date(user.subscription_ends) : null
  const isTrial = user?.subscription_tier === 'pro_trial'
  const trialActive = Boolean(isTrial && trialEnds && trialEnds.getTime() > Date.now())

  if (isTrial && !trialActive) {
    return NextResponse.json({
      error: 'Your 7-day trial has ended. Please upgrade to continue practising.',
      upgradeRequired: true,
    }, { status: 402 })
  }

  if (trialActive) {
    const today = await queryOne<{ session_count: number }>(
      `SELECT COUNT(*) as session_count
       FROM sessions
       WHERE user_id = ? AND DATE(started_at) = CURDATE()`,
      [session.user.id]
    )

    if ((today?.session_count ?? 0) >= TRIAL_DAILY_SESSION_LIMIT) {
      return NextResponse.json({
        error: 'Your trial includes 2 practice sessions per day. Upgrade to Pro for unlimited practice.',
        dailyLimitReached: true,
      }, { status: 429 })
    }
  }

  const { scenarioId, scenarioType = 'global' } = await req.json()
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })

  // Look up from global scenarios or user scenarios
  let scenario = null
  if (scenarioType === 'user') {
    scenario = await queryOne(
      'SELECT *, "user" as scenario_source FROM user_scenarios WHERE id = ? AND user_id = ? AND is_active = 1',
      [scenarioId, session.user.id]
    )
  } else {
    scenario = await queryOne(
      'SELECT *, "global" as scenario_source FROM scenarios WHERE id = ? AND is_active = 1',
      [scenarioId]
    )
  }

  if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })

  const id = randomUUID()
  await execute(
    'INSERT INTO sessions (id, user_id, scenario_id) VALUES (?, ?, ?)',
    [id, session.user.id, scenarioId]
  )

  return NextResponse.json({ sessionId: id, scenario, scenarioType })
}
