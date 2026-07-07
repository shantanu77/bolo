import crypto from 'crypto'
import { execute, queryOne } from '@/lib/db'
import { createMailTransport, sender } from '@/lib/mail'

const DUPLICATE_COLUMN = 'ER_DUP_FIELDNAME'

export async function ensureEmailVerificationColumns() {
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN email_verified_at DATETIME')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR(64)')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN email_verification_expires DATETIME')
  await execute(
    `UPDATE users
     SET email_verified_at = COALESCE(created_at, NOW())
     WHERE email_verified_at IS NULL
       AND account_status <> 'pending_verification'
       AND email_verification_token_hash IS NULL`
  )
}

export function createVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function sendVerificationEmail(params: {
  userId: string
  name: string
  email: string
}) {
  await ensureEmailVerificationColumns()

  const { token, tokenHash } = createVerificationToken()
  await execute(
    `UPDATE users
     SET email_verification_token_hash = ?,
         email_verification_expires = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ?`,
    [tokenHash, params.userId]
  )

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verifyUrl = new URL('/api/auth/verify-email', baseUrl)
  verifyUrl.searchParams.set('token', token)

  const transporter = createMailTransport()
  await transporter.sendMail({
    from: sender('AuraXpress'),
    to: params.email,
    subject: 'Verify your AuraXpress email',
    text: `Hi ${params.name},

Welcome to AuraXpress. Please verify your email address by opening this link:

${verifyUrl.toString()}

This link expires in 24 hours.

AuraXpress`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Welcome to AuraXpress. Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl.toString()}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Verify email</a></p>
      <p style="font-size:13px;color:#6b7280">This link expires in 24 hours.</p>
    </div>`,
  })
}

export async function verifyEmailToken(token: string) {
  await ensureEmailVerificationColumns()
  const tokenHash = hashToken(token)
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users
     WHERE email_verification_token_hash = ?
       AND email_verification_expires > NOW()
       AND email_verified_at IS NULL`,
    [tokenHash]
  )
  if (!user) return false

  await execute(
    `UPDATE users
     SET email_verified_at = NOW(),
         email_verification_token_hash = NULL,
         email_verification_expires = NULL,
         account_status = 'active'
     WHERE id = ?`,
    [user.id]
  )
  return true
}

async function addColumnIfMissing(sql: string) {
  try {
    await execute(sql)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: string }).code === DUPLICATE_COLUMN) return
    throw error
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
