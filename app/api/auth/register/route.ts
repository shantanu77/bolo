import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { execute, queryOne } from '@/lib/db'
import { ensureUserAdminColumns } from '@/lib/admin'
import { ensureEmailVerificationColumns, sendVerificationEmail } from '@/lib/email-verification'

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!name || !normalizedEmail || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
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
    [id, name.trim(), normalizedEmail, hash]
  )

  await sendVerificationEmail({ userId: id, name: name.trim(), email: normalizedEmail })

  return NextResponse.json({ success: true, verificationRequired: true })
}
