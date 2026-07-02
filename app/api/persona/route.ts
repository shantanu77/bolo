import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const persona = await queryOne('SELECT * FROM personas WHERE user_id = ?', [session.user.id])
  return NextResponse.json({ persona })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    native_language, job_role, seniority, industry,
    company_size, interacts_with, challenges, goals,
  } = body

  const existing = await queryOne('SELECT id FROM personas WHERE user_id = ?', [session.user.id])

  if (existing) {
    await execute(
      `UPDATE personas SET native_language=?, job_role=?, seniority=?, industry=?,
       company_size=?, interacts_with=?, challenges=?, goals=?, updated_at=NOW()
       WHERE user_id=?`,
      [
        native_language, job_role, seniority, industry, company_size,
        JSON.stringify(interacts_with), JSON.stringify(challenges), JSON.stringify(goals),
        session.user.id,
      ]
    )
  } else {
    await execute(
      `INSERT INTO personas (id, user_id, native_language, job_role, seniority, industry,
       company_size, interacts_with, challenges, goals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), session.user.id,
        native_language, job_role, seniority, industry, company_size,
        JSON.stringify(interacts_with), JSON.stringify(challenges), JSON.stringify(goals),
      ]
    )
  }

  return NextResponse.json({ success: true })
}
