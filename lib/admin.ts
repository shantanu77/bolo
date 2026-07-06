import { execute } from '@/lib/db'

const DUPLICATE_COLUMN = 'ER_DUP_FIELDNAME'

export async function ensureUserAdminColumns() {
  await addColumnIfMissing(
    `ALTER TABLE users ADD COLUMN user_role VARCHAR(20) NOT NULL DEFAULT 'user'`
  )
  await addColumnIfMissing(
    `ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active'`
  )
}

async function addColumnIfMissing(sql: string) {
  try {
    await execute(sql)
  } catch (error) {
    if (isDuplicateColumn(error)) return
    throw error
  }
}

function isDuplicateColumn(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === DUPLICATE_COLUMN
}

export function getSuperadminEmails() {
  return (process.env.SUPERADMIN_EMAILS ?? 'shantanu@mobileyug.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isSuperadminUser(user?: {
  email?: string | null
  user_role?: string | null
}) {
  if (!user) return false
  if (user.user_role === 'superadmin') return true
  return Boolean(user.email && getSuperadminEmails().includes(user.email.toLowerCase()))
}
