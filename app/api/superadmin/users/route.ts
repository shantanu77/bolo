import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { execute, query, queryOne } from '@/lib/db'
import { ensureUserAdminColumns, isSuperadminUser } from '@/lib/admin'
import { ensurePaymentOrdersTable } from '@/lib/billing'
import { ensureApiUsageTable } from '@/lib/usage'
import { createMailTransport, sender } from '@/lib/mail'
import { validatePassword } from '@/lib/password'
import { ensurePasswordResetStorage } from '@/lib/password-reset'

const USER_STATUSES = new Set(['active', 'suspended', 'pending_verification'])
const SUBSCRIPTION_TYPES = new Set(['free', 'pro_trial', 'pro'])
const USER_ROLES = new Set(['user', 'superadmin'])

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperadminUser(session?.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureUserAdminColumns()
  await ensurePaymentOrdersTable()
  await ensureApiUsageTable()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() ?? ''
  const like = `%${search}%`
  const requestedStatus = searchParams.get('status') ?? 'not_suspended'
  const status = new Set(['not_suspended', 'active', 'pending_verification', 'suspended', 'all']).has(requestedStatus)
    ? requestedStatus
    : 'not_suspended'
  const requestedPlan = searchParams.get('plan') ?? 'all'
  const plan = requestedPlan === 'all' || SUBSCRIPTION_TYPES.has(requestedPlan) ? requestedPlan : 'all'
  const requestedRole = searchParams.get('role') ?? 'all'
  const role = requestedRole === 'all' || USER_ROLES.has(requestedRole) ? requestedRole : 'all'
  const requestedVerified = searchParams.get('verified') ?? 'all'
  const verified = new Set(['all', 'verified', 'unverified']).has(requestedVerified) ? requestedVerified : 'all'

  const users = await query(
    `SELECT
       u.id, u.name, u.email, u.subscription_tier, u.subscription_ends,
       u.user_role, u.account_status, u.xp, u.level, u.streak_days,
       u.created_at, u.last_practiced,
       COALESCE(sess.session_count, 0) as session_count,
       COALESCE(att.attempt_count, 0) as attempt_count,
       att.last_attempt_at,
       pay.last_paid_at,
       COALESCE(pay.paid_amount_paise, 0) as paid_amount_paise,
       COALESCE(usage_stats.usage_call_count, 0) as usage_call_count,
       COALESCE(usage_stats.usage_total_tokens, 0) as usage_total_tokens,
       COALESCE(usage_stats.usage_cost_usd, 0) as usage_cost_usd,
       COALESCE(usage_stats.gpt_cost_usd, 0) as gpt_cost_usd,
       COALESCE(usage_stats.tts_cost_usd, 0) as tts_cost_usd,
       COALESCE(usage_stats.stt_cost_usd, 0) as stt_cost_usd
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) as session_count
       FROM sessions GROUP BY user_id
     ) sess ON sess.user_id = u.id
     LEFT JOIN (
       SELECT user_id, COUNT(*) as attempt_count, MAX(created_at) as last_attempt_at
       FROM attempts GROUP BY user_id
     ) att ON att.user_id = u.id
     LEFT JOIN (
       SELECT user_id, MAX(paid_at) as last_paid_at, SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount_paise
       FROM payment_orders GROUP BY user_id
     ) pay ON pay.user_id = u.id
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) as usage_call_count,
         SUM(total_tokens) as usage_total_tokens,
         SUM(cost_usd) as usage_cost_usd,
         SUM(CASE WHEN model = 'gpt-4o' THEN cost_usd ELSE 0 END) as gpt_cost_usd,
         SUM(CASE WHEN model = 'tts-1' THEN cost_usd ELSE 0 END) as tts_cost_usd,
         SUM(CASE WHEN model = 'nova-2' THEN cost_usd ELSE 0 END) as stt_cost_usd
       FROM api_usage
       WHERE user_id IS NOT NULL
       GROUP BY user_id
     ) usage_stats ON usage_stats.user_id = u.id
     WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?)
       AND (? = 'all' OR (? = 'not_suspended' AND u.account_status <> 'suspended') OR u.account_status = ?)
       AND (? = 'all' OR u.subscription_tier = ?)
       AND (? = 'all' OR u.user_role = ?)
       AND (? = 'all' OR (? = 'verified' AND u.email_verified_at IS NOT NULL) OR (? = 'unverified' AND u.email_verified_at IS NULL))
     ORDER BY u.created_at DESC
     LIMIT 200`,
    [search, like, like, status, status, status, plan, plan, role, role, verified, verified, verified]
  )

  const cleanup = await queryOne<{ candidate_count: number }>(
    `SELECT COUNT(*) AS candidate_count
     FROM users u
     WHERE u.account_status = 'pending_verification'
       AND u.email_verified_at IS NULL
       AND u.user_role <> 'superadmin'
       AND u.created_at < DATE_SUB(NOW(), INTERVAL 2 DAY)
       AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM payment_orders p WHERE p.user_id = u.id AND p.status = 'paid')`
  )

  return NextResponse.json({
    users,
    spamCleanupCandidates: Number(cleanup?.candidate_count ?? 0),
    filters: { search, status, plan, role, verified },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperadminUser(session?.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureUserAdminColumns()
  await ensurePaymentOrdersTable()
  await ensureApiUsageTable()

  const body = await req.json()
  const action = body.action

  if (action === 'cleanup_spam') {
    if (body.confirmation !== 'DELETE_UNVERIFIED_SPAM') {
      return NextResponse.json({ error: 'Cleanup confirmation is required' }, { status: 400 })
    }

    const days = clampNumber(body.days, 2, 365, 2)
    await execute(
      `DELETE au FROM api_usage au
       JOIN users u ON u.id = au.user_id
       WHERE u.account_status = 'pending_verification'
         AND u.email_verified_at IS NULL
         AND u.user_role <> 'superadmin'
         AND u.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
         AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM payment_orders p WHERE p.user_id = u.id AND p.status = 'paid')`,
      [days]
    )
    const result = await execute(
      `DELETE u FROM users u
       WHERE u.account_status = 'pending_verification'
         AND u.email_verified_at IS NULL
         AND u.user_role <> 'superadmin'
         AND u.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
         AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.user_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM payment_orders p WHERE p.user_id = u.id AND p.status = 'paid')`,
      [days]
    )
    return NextResponse.json({ success: true, deleted: result.affectedRows })
  }

  const userId = clean(body.userId, 36)
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const user = await queryOne<{ id: string; name: string; email: string }>(
    'SELECT id, name, email FROM users WHERE id = ?',
    [userId]
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (action === 'update_user') {
    const accountStatus = clean(body.account_status, 20)
    const subscriptionTier = clean(body.subscription_tier, 20)
    const userRole = clean(body.user_role, 20)

    if (!USER_STATUSES.has(accountStatus)) return NextResponse.json({ error: 'Invalid account status' }, { status: 400 })
    if (!SUBSCRIPTION_TYPES.has(subscriptionTier)) return NextResponse.json({ error: 'Invalid subscription type' }, { status: 400 })
    if (!USER_ROLES.has(userRole)) return NextResponse.json({ error: 'Invalid user role' }, { status: 400 })

    await execute(
      `UPDATE users
       SET account_status = ?, subscription_tier = ?, user_role = ?
       WHERE id = ?`,
      [accountStatus, subscriptionTier, userRole, userId]
    )
    return NextResponse.json({ success: true })
  }

  if (action === 'extend_trial') {
    const days = clampNumber(body.days, 1, 365, 7)
    await execute(
      `UPDATE users
       SET subscription_tier = 'pro_trial',
           account_status = 'active',
           subscription_ends = DATE_ADD(GREATEST(COALESCE(subscription_ends, NOW()), NOW()), INTERVAL ? DAY)
       WHERE id = ?`,
      [days, userId]
    )
    return NextResponse.json({ success: true })
  }

  if (action === 'set_password') {
    const password = typeof body.password === 'string' ? body.password : ''
    const passwordError = validatePassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 12)
    await ensurePasswordResetStorage()
    await execute(
      'UPDATE users SET password_hash = ?, password_reset_token_hash = NULL, password_reset_expires = NULL WHERE id = ?',
      [passwordHash, userId]
    )

    try {
      await sendPasswordChangedEmail({ to: user.email, name: user.name, password })
      return NextResponse.json({ success: true, emailSent: true })
    } catch (error) {
      console.error('Password changed but email delivery failed', error)
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Password was changed, but the email could not be sent. Please retry with a new password.',
      })
    }
  }

  if (action === 'manual_payment') {
    const amountRupees = clampNumber(body.amount_rupees, 1, 1000000, 499)
    const days = clampNumber(body.days, 1, 3650, 30)
    const notes = clean(body.notes, 500)
    const amountPaise = Math.round(amountRupees * 100)
    const receipt = `manual_${Date.now()}`.slice(0, 40)
    const orderId = `manual_${randomUUID()}`
    const paymentId = `manual_${randomUUID()}`

    await execute(
      `INSERT INTO payment_orders
       (user_id, plan, amount, currency, receipt, razorpay_order_id, razorpay_payment_id, status, error_message, paid_at)
       VALUES (?, 'pro_manual', ?, 'INR', ?, ?, ?, 'paid', ?, NOW())`,
      [userId, amountPaise, receipt, orderId, paymentId, notes || null]
    )

    await execute(
      `UPDATE users
       SET subscription_tier = 'pro',
           account_status = 'active',
           subscription_ends = DATE_ADD(GREATEST(COALESCE(subscription_ends, NOW()), NOW()), INTERVAL ? DAY)
       WHERE id = ?`,
      [days, userId]
    )

    if (body.send_receipt === true) {
      await sendReceiptEmail({
        to: user.email,
        name: user.name,
        amountRupees,
        days,
        receipt,
        notes,
      })
    }

    return NextResponse.json({ success: true, receipt })
  }

  if (action === 'send_receipt') {
    const amountRupees = clampNumber(body.amount_rupees, 1, 1000000, 499)
    const days = clampNumber(body.days, 1, 3650, 30)
    const receipt = clean(body.receipt, 80) || `receipt_${Date.now()}`
    const notes = clean(body.notes, 500)
    await sendReceiptEmail({
      to: user.email,
      name: user.name,
      amountRupees,
      days,
      receipt,
      notes,
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

async function sendPasswordChangedEmail(params: { to: string; name: string; password: string }) {
  const transporter = createMailTransport()
  await transporter.sendMail({
    from: sender('AuraXpress Support'),
    to: params.to,
    subject: 'Your AuraXpress password was updated',
    text: `Hi ${params.name},

An AuraXpress administrator has set a new password for your account.

New password: ${params.password}

Sign in and keep this password private. If you did not expect this change, contact AuraXpress support immediately.

AuraXpress`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>An AuraXpress administrator has set a new password for your account.</p>
      <p style="padding:12px;background:#f3f4f6;border-radius:8px"><strong>New password:</strong> ${escapeHtml(params.password)}</p>
      <p>Sign in and keep this password private. If you did not expect this change, contact AuraXpress support immediately.</p>
      <p>AuraXpress</p>
    </div>`,
  })
}

async function sendReceiptEmail(params: {
  to: string
  name: string
  amountRupees: number
  days: number
  receipt: string
  notes: string
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  })

  const subject = `AuraXpress payment receipt - ${params.receipt}`
  const text = `Hi ${params.name},

We have received your AuraXpress Pro payment.

Receipt: ${params.receipt}
Amount: ₹${params.amountRupees}
Access added: ${params.days} days
${params.notes ? `Notes: ${params.notes}\n` : ''}
Thank you,
AuraXpress
`

  await transporter.sendMail({
    from: `"AuraXpress Billing" <${process.env.EMAIL_FROM}>`,
    to: params.to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>We have received your <strong>AuraXpress Pro</strong> payment.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px;color:#6b7280">Receipt</td><td style="padding:6px 12px"><strong>${escapeHtml(params.receipt)}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#6b7280">Amount</td><td style="padding:6px 12px">₹${params.amountRupees}</td></tr>
        <tr><td style="padding:6px 12px;color:#6b7280">Access added</td><td style="padding:6px 12px">${params.days} days</td></tr>
      </table>
      ${params.notes ? `<p>${escapeHtml(params.notes)}</p>` : ''}
      <p>Thank you,<br/>AuraXpress</p>
    </div>`,
  })
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.round(num)))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
