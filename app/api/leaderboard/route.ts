import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthYear = new Date().toISOString().slice(0, 7)

  const leaders = await query<{
    user_id: string; xp: number; name: string;
    streak_days: number; level: number; show_on_leaderboard: number
  }>(
    `SELECT mx.user_id, mx.xp, u.name, u.streak_days, u.level, u.show_on_leaderboard
     FROM monthly_xp mx
     JOIN users u ON u.id = mx.user_id
     WHERE mx.month_year = ? AND u.show_on_leaderboard = 1
     ORDER BY mx.xp DESC
     LIMIT 100`,
    [monthYear]
  )

  const ranked = leaders.map((u, i) => ({
    rank: i + 1,
    name: u.name,
    userId: u.user_id,
    xp: u.xp,
    streak_days: u.streak_days,
    level: u.level,
    isMe: u.user_id === session.user.id,
  }))

  const myRank = ranked.find(r => r.isMe)

  return NextResponse.json({ leaders: ranked, myRank: myRank ?? null, monthYear })
}
