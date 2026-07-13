import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { execute, queryOne } from '@/lib/db'
import { createMailTransport, sender } from '@/lib/mail'

const DUPLICATE_COLUMN = 'ER_DUP_FIELDNAME'

export async function ensurePasswordResetStorage() {
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(64)')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN password_reset_expires DATETIME')
  await execute(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ip_hash CHAR(64) NOT NULL,
      email_hash CHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT NOW(),
      INDEX idx_password_reset_ip_created (ip_hash, created_at),
      INDEX idx_password_reset_email_created (email_hash, created_at),
      INDEX idx_password_reset_created (created_at)
    )
  `)
}

export async function allowPasswordResetRequest(req: NextRequest, email: string) {
  await ensurePasswordResetStorage()
  const ipHash = privateHash(clientIp(req))
  const emailHash = privateHash(email)
  const [ipCount, emailCount] = await Promise.all([
    queryOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM password_reset_requests WHERE ip_hash = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [ipHash]
    ),
    queryOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM password_reset_requests WHERE email_hash = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [emailHash]
    ),
  ])

  if (Number(ipCount?.total ?? 0) >= 10 || Number(emailCount?.total ?? 0) >= 3) return false
  await execute('INSERT INTO password_reset_requests (ip_hash, email_hash) VALUES (?, ?)', [ipHash, emailHash])
  return true
}

export async function createAndSendPasswordReset(params: { userId: string; name: string; email: string }) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = publicHash(token)
  await execute(
    `UPDATE users SET password_reset_token_hash = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?`,
    [tokenHash, params.userId]
  )

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = new URL('/reset-password', baseUrl)
  resetUrl.searchParams.set('token', token)

  await createMailTransport().sendMail({
    from: sender('AuraXpress Support'),
    to: params.email,
    subject: 'Reset your AuraXpress password',
    text: `Hi ${params.name},\n\nOpen this link to choose a new AuraXpress password:\n\n${resetUrl.toString()}\n\nThis one-time link expires in 30 minutes. If you did not request it, you can ignore this email.\n\nAuraXpress`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Use the button below to choose a new AuraXpress password.</p>
      <p><a href="${resetUrl.toString()}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600">Reset password</a></p>
      <p style="font-size:13px;color:#6b7280">This one-time link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
    </div>`,
  })
}

export function hashPasswordResetToken(token: string) {
  return publicHash(token)
}

function publicHash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function privateHash(value: string) {
  return crypto.createHmac('sha256', process.env.NEXTAUTH_SECRET || 'auraxpress-password-reset').update(value).digest('hex')
}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

async function addColumnIfMissing(sql: string) {
  try {
    await execute(sql)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === DUPLICATE_COLUMN) return
    throw error
  }
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}
