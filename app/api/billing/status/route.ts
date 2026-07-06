import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import {
  PRO_PLAN_AMOUNT_PAISE,
  PRO_PLAN_CURRENCY,
  PRO_PLAN_DURATION_DAYS,
} from '@/lib/billing'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await queryOne<{
    subscription_tier: string
    subscription_ends: string | null
  }>(
    'SELECT subscription_tier, subscription_ends FROM users WHERE id = ?',
    [session.user.id]
  )

  const endsAt = user?.subscription_ends ? new Date(user.subscription_ends) : null
  const now = new Date()
  const isActive = Boolean(
    (user?.subscription_tier === 'pro' && (!endsAt || endsAt.getTime() > now.getTime())) ||
    (user?.subscription_tier === 'pro_trial' && endsAt && endsAt.getTime() > now.getTime())
  )

  return NextResponse.json({
    subscription_tier: user?.subscription_tier ?? 'free',
    subscription_ends: user?.subscription_ends ?? null,
    isActive,
    isTrial: user?.subscription_tier === 'pro_trial',
    plan: {
      id: 'pro_monthly',
      amount: PRO_PLAN_AMOUNT_PAISE,
      amount_rupees: PRO_PLAN_AMOUNT_PAISE / 100,
      currency: PRO_PLAN_CURRENCY,
      duration_days: PRO_PLAN_DURATION_DAYS,
    },
  })
}
