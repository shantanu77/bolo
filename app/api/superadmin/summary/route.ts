import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperadminUser } from '@/lib/admin'
import { getAdminSummary } from '@/lib/admin-report'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isSuperadminUser(session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const summary = await getAdminSummary()
  return NextResponse.json(summary)
}
