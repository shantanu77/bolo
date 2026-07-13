import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperadminUser, ensureUserAdminColumns } from '@/lib/admin'
import { query, queryOne } from '@/lib/db'
import { ensureEmailVerificationColumns } from '@/lib/email-verification'
import { ensurePaymentOrdersTable } from '@/lib/billing'
import { ensureApiUsageTable } from '@/lib/usage'

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperadminUser(session?.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = params.userId.slice(0, 36)
  await Promise.all([
    ensureUserAdminColumns(),
    ensureEmailVerificationColumns(),
    ensurePaymentOrdersTable(),
    ensureApiUsageTable(),
  ])

  const user = await queryOne<Record<string, string | number | null>>(
    `SELECT id, name, email, email_verified_at, subscription_tier, subscription_ends,
            user_role, account_status, xp, level, streak_days, streak_shield,
            last_practiced, show_on_leaderboard, created_at, updated_at
     FROM users WHERE id = ?`,
    [userId]
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [practice, billing, usage, content, recentAttempts, recentPayments, usageBreakdown] = await Promise.all([
    queryOne<Record<string, string | number | null>>(
      `SELECT
         COUNT(DISTINCT s.id) AS session_count,
         COUNT(a.id) AS attempt_count,
         MAX(a.created_at) AS last_attempt_at,
         ROUND(COALESCE(SUM(a.duration_sec), 0) / 60, 1) AS practice_minutes,
         ROUND(AVG(a.score_overall), 1) AS avg_score,
         MAX(a.score_overall) AS best_score,
         ROUND(AVG(a.words_per_minute), 1) AS avg_wpm,
         ROUND(AVG(a.filler_word_count), 1) AS avg_fillers
       FROM sessions s
       LEFT JOIN attempts a ON a.session_id = s.id
       WHERE s.user_id = ?`,
      [userId]
    ),
    queryOne<Record<string, string | number | null>>(
      `SELECT
         COUNT(*) AS order_count,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_order_count,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount_paise,
         MAX(CASE WHEN status = 'paid' THEN paid_at END) AS last_paid_at
       FROM payment_orders WHERE user_id = ?`,
      [userId]
    ),
    queryOne<Record<string, string | number | null>>(
      `SELECT COUNT(*) AS call_count, COALESCE(SUM(total_tokens), 0) AS total_tokens,
              COALESCE(SUM(cost_usd), 0) AS cost_usd, MAX(created_at) AS last_call_at
       FROM api_usage WHERE user_id = ?`,
      [userId]
    ),
    queryOne<Record<string, string | number | null>>(
      `SELECT
         (SELECT COUNT(*) FROM learning_guides WHERE user_id = ?) AS guide_count,
         (SELECT COUNT(*) FROM user_categories WHERE user_id = ?) AS category_count,
         (SELECT COUNT(*) FROM user_scenarios WHERE user_id = ?) AS scenario_count,
         (SELECT COUNT(*) FROM personas WHERE user_id = ?) AS has_persona`,
      [userId, userId, userId, userId]
    ),
    query<Record<string, string | number | null>>(
      `SELECT id, score_overall, score_clarity, score_fluency, score_vocabulary,
              score_structure, score_confidence, words_per_minute, duration_sec, created_at
       FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [userId]
    ),
    query<Record<string, string | number | null>>(
      `SELECT id, plan, amount, currency, receipt, status, created_at, paid_at
       FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [userId]
    ),
    query<Record<string, string | number | null>>(
      `SELECT call_type, model, COUNT(*) AS call_count, SUM(total_tokens) AS total_tokens, SUM(cost_usd) AS cost_usd
       FROM api_usage WHERE user_id = ? GROUP BY call_type, model ORDER BY cost_usd DESC LIMIT 10`,
      [userId]
    ),
  ])

  return NextResponse.json({
    user,
    vitals: { practice: practice ?? {}, billing: billing ?? {}, usage: usage ?? {}, content: content ?? {} },
    recentAttempts,
    recentPayments,
    usageBreakdown,
  })
}
