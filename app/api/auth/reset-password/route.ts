import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { execute, queryOne } from '@/lib/db'
import { ensurePasswordResetStorage, hashPasswordResetToken } from '@/lib/password-reset'
import { validatePassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body.token ?? '')
  const password = String(body.password ?? '')
  const passwordError = validatePassword(password)
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
  if (!/^[a-f0-9]{64}$/.test(token)) return invalidToken()

  await ensurePasswordResetStorage()
  const tokenHash = hashPasswordResetToken(token)
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE password_reset_token_hash = ? AND password_reset_expires > NOW() LIMIT 1`,
    [tokenHash]
  )
  if (!user) return invalidToken()

  const hash = await bcrypt.hash(password, 12)
  const result = await execute(
    `UPDATE users
     SET password_hash = ?, password_reset_token_hash = NULL, password_reset_expires = NULL
     WHERE id = ? AND password_reset_token_hash = ? AND password_reset_expires > NOW()`,
    [hash, user.id, tokenHash]
  )
  if (!result.affectedRows) return invalidToken()

  return NextResponse.json({ success: true })
}

function invalidToken() {
  return NextResponse.json({ error: 'This password reset link is invalid or has expired.' }, { status: 400 })
}
