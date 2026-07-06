import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { parseJsonArray, parseJsonObject } from '@/lib/json'

const DEFAULT_TIMEZONE = 'Asia/Kolkata'

interface PersonaRow {
  id: string
  native_language: string | null
  job_role: string | null
  seniority: string | null
  industry: string | null
  company_size: string | null
  interacts_with: unknown
  challenges: unknown
  goals: unknown
  bio_transcript: string | null
  bio_structured: unknown
  bio_recorded_at: string | null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUserPreferencesTable()

  const [user, persona, preferences] = await Promise.all([
    queryOne<{
      id: string
      name: string
      email: string
      subscription_tier: string
      xp: number
      level: number
      streak_days: number
      avatar_color: string
      show_on_leaderboard: number
      created_at: string
    }>(
      `SELECT id, name, email, subscription_tier, xp, level, streak_days,
       avatar_color, show_on_leaderboard, created_at
       FROM users WHERE id = ?`,
      [session.user.id]
    ),
    queryOne<PersonaRow>('SELECT * FROM personas WHERE user_id = ?', [session.user.id]),
    queryOne<{ timezone: string }>('SELECT timezone FROM user_preferences WHERE user_id = ?', [session.user.id]),
  ])

  return NextResponse.json({
    user: user ? {
      ...user,
      show_on_leaderboard: Boolean(user.show_on_leaderboard),
    } : null,
    preferences: {
      timezone: preferences?.timezone ?? DEFAULT_TIMEZONE,
    },
    persona: persona ? {
      native_language:  persona.native_language ?? 'Hindi',
      job_role:         persona.job_role ?? '',
      seniority:        persona.seniority ?? '',
      industry:         persona.industry ?? '',
      company_size:     persona.company_size ?? '',
      interacts_with:   parseJsonArray(persona.interacts_with).map(String),
      challenges:       parseJsonArray(persona.challenges).map(String),
      goals:            parseJsonArray(persona.goals).map(String),
      bio_transcript:   persona.bio_transcript,
      bio_structured:   parseJsonObject(persona.bio_structured),
      bio_recorded_at:  persona.bio_recorded_at,
    } : {
      native_language: 'Hindi',
      job_role: '',
      seniority: '',
      industry: '',
      company_size: '',
      interacts_with: [],
      challenges: [],
      goals: [],
      bio_transcript: null,
      bio_structured: null,
      bio_recorded_at: null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUserPreferencesTable()

  const body = await req.json()
  const user = body.user ?? {}
  const preferences = body.preferences ?? {}
  const persona = body.persona ?? {}

  const name = cleanText(user.name, 255)
  const avatarColor = normalizeColor(user.avatar_color)
  const showOnLeaderboard = user.show_on_leaderboard === true ? 1 : 0
  const timezone = cleanText(preferences.timezone, 64) || DEFAULT_TIMEZONE

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 422 })
  }

  await execute(
    `UPDATE users
     SET name = ?, avatar_color = ?, show_on_leaderboard = ?
     WHERE id = ?`,
    [name, avatarColor, showOnLeaderboard, session.user.id]
  )

  await execute(
    `INSERT INTO user_preferences (user_id, timezone)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE timezone = VALUES(timezone), updated_at = NOW()`,
    [session.user.id, timezone]
  )

  const existing = await queryOne<{ id: string }>('SELECT id FROM personas WHERE user_id = ?', [session.user.id])
  const personaParams = {
    native_language: cleanText(persona.native_language, 50) || 'Hindi',
    job_role:        cleanText(persona.job_role, 255),
    seniority:       cleanText(persona.seniority, 50),
    industry:        cleanText(persona.industry, 100),
    company_size:    cleanText(persona.company_size, 50),
    interacts_with:  JSON.stringify(cleanArray(persona.interacts_with)),
    challenges:      JSON.stringify(cleanArray(persona.challenges)),
    goals:           JSON.stringify(cleanArray(persona.goals)),
  }

  if (existing) {
    await execute(
      `UPDATE personas SET native_language=?, job_role=?, seniority=?, industry=?,
       company_size=?, interacts_with=?, challenges=?, goals=?, updated_at=NOW()
       WHERE user_id=?`,
      [
        personaParams.native_language,
        personaParams.job_role,
        personaParams.seniority,
        personaParams.industry,
        personaParams.company_size,
        personaParams.interacts_with,
        personaParams.challenges,
        personaParams.goals,
        session.user.id,
      ]
    )
  } else {
    await execute(
      `INSERT INTO personas (id, user_id, native_language, job_role, seniority, industry,
       company_size, interacts_with, challenges, goals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        session.user.id,
        personaParams.native_language,
        personaParams.job_role,
        personaParams.seniority,
        personaParams.industry,
        personaParams.company_size,
        personaParams.interacts_with,
        personaParams.challenges,
        personaParams.goals,
      ]
    )
  }

  return NextResponse.json({ success: true })
}

async function ensureUserPreferencesTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id    VARCHAR(36) PRIMARY KEY,
      timezone   VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
      created_at DATETIME NOT NULL DEFAULT NOW(),
      updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `)
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()).slice(0, 20)
    : []
}

function normalizeColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#6366f1'
}
