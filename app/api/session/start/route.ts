import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
