import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { allowPasswordResetRequest, createAndSendPasswordReset } from '@/lib/password-reset'

const GENERIC_MESSAGE = 'If an eligible account exists for that email, a password reset link has been sent.'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 254)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }

  const allowed = await allowPasswordResetRequest(req, email)
  if (!allowed) return NextResponse.json({ message: GENERIC_MESSAGE })

  const user = await queryOne<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM users
     WHERE email = ? AND email_verified_at IS NOT NULL AND account_status <> 'suspended'
     LIMIT 1`,
    [email]
  )

  if (user) {
    try {
      await createAndSendPasswordReset({ userId: user.id, name: user.name, email: user.email })
    } catch (error) {
      console.error('Password reset email failed', error)
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE })
}
