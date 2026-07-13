import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { execute, queryOne } from '@/lib/db'
import { ensureUserAdminColumns } from '@/lib/admin'
import { ensureEmailVerificationColumns, sendVerificationEmail } from '@/lib/email-verification'
import { checkAndRecordRegistrationAttempt } from '@/lib/registration-security'

export async function POST(req: NextRequest) {
  const { name, email, password, website, formStartedAt } = await req.json()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const normalizedName = String(name ?? '').trim()

  // Real users never see or fill this field. Return a generic success response so
  // basic form-filling bots do not learn how to bypass the trap.
  if (website) {
    return NextResponse.json({ success: true, verificationRequired: true })
  }

  if (!normalizedName || !normalizedEmail || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (normalizedName.length < 2 || normalizedName.length > 100 || /https?:\/\//i.test(normalizedName)) {
    return NextResponse.json({ error: 'Enter a valid name' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const startedAt = Number(formStartedAt)
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2000 || Date.now() - startedAt > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Please reload the page and try again' }, { status: 400 })
  }

  const allowed = await checkAndRecordRegistrationAttempt(req, normalizedEmail)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [normalizedEmail])
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  await ensureUserAdminColumns()
  await ensureEmailVerificationColumns()

  const hash = await bcrypt.hash(password, 12)
  const id   = randomUUID()

  await execute(
    `INSERT INTO users
     (id, name, email, password_hash, subscription_tier, subscription_ends, user_role, account_status)
     VALUES (?, ?, ?, ?, 'pro_trial', DATE_ADD(NOW(), INTERVAL 7 DAY), 'user', 'pending_verification')`,
    [id, normalizedName, normalizedEmail, hash]
  )

  await sendVerificationEmail({ userId: id, name: normalizedName, email: normalizedEmail })

  return NextResponse.json({ success: true, verificationRequired: true })
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}
