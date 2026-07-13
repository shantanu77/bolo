import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { execute, queryOne } from '@/lib/db'

const IP_LIMIT = 5
const EMAIL_LIMIT = 3

export async function ensureRegistrationAttemptsTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS registration_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ip_hash CHAR(64) NOT NULL,
      email_hash CHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT NOW(),
      INDEX idx_registration_attempts_ip_created (ip_hash, created_at),
      INDEX idx_registration_attempts_email_created (email_hash, created_at),
      INDEX idx_registration_attempts_created (created_at)
    )
  `)
}

export async function checkAndRecordRegistrationAttempt(req: NextRequest, email: string) {
  await ensureRegistrationAttemptsTable()

  const ipHash = hashValue(clientIp(req))
  const emailHash = hashValue(email)
  const [ipAttempts, emailAttempts] = await Promise.all([
    queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM registration_attempts
       WHERE ip_hash = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [ipHash]
    ),
    queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM registration_attempts
       WHERE email_hash = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [emailHash]
    ),
  ])

  if (Number(ipAttempts?.total ?? 0) >= IP_LIMIT || Number(emailAttempts?.total ?? 0) >= EMAIL_LIMIT) {
    return false
  }

  await execute(
    'INSERT INTO registration_attempts (ip_hash, email_hash) VALUES (?, ?)',
    [ipHash, emailHash]
  )

  // Keep this small operational table from growing forever.
  if (Math.random() < 0.02) {
    await execute('DELETE FROM registration_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)')
  }

  return true
}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

function hashValue(value: string) {
  const secret = process.env.NEXTAUTH_SECRET || 'auraxpress-registration-rate-limit'
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}
