'use client'
import { useEffect, useState } from 'react'

interface Leader {
  rank: number; name: string; userId: string; xp: number
  streak_days: number; level: number; isMe: boolean
}
interface LeaderboardData {
  leaders: Leader[]
  myRank: Leader | null
  monthYear: string
}

const LEVEL_TITLES = [
  '', 'First Word', 'Trying', 'Getting There', 'Conversant', 'Confident',
  'Fluent', 'Articulate', 'Polished', 'Eloquent', 'Masterclass',
]

export default function LeaderboardPage() {
  const [data, setData]     = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
  if (!data)   return null

  const monthLabel = new Date(data.monthYear + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">{monthLabel} · Resets on 1st of each month</p>
      </div>

      {data.myRank && (
        <div className="bg-indigo-600 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-indigo-200 text-xs font-semibold mb-1">Your rank this month</div>
              <div className="text-3xl font-bold">#{data.myRank.rank}</div>
              <div className="text-indigo-200 text-sm mt-1">{data.myRank.xp} XP · Lv.{data.myRank.level} {LEVEL_TITLES[data.myRank.level]}</div>
            </div>
            <div className="text-right">
              <div className="text-indigo-200 text-xs">Streak</div>
              <div className="text-xl font-bold">{data.myRank.streak_days}d 🔥</div>
            </div>
          </div>
        </div>
      )}

      {!data.myRank && (
        <div className="bg-gray-50 rounded-2xl p-5 text-center text-gray-500 text-sm mb-6 border border-gray-100">
          You are not on the leaderboard yet. Complete practice sessions this month to appear here.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {data.leaders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No one on the leaderboard yet this month. Be the first!</div>
        ) : (
          <div>
            {data.leaders.map(leader => (
              <div key={leader.userId}
                className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 ${leader.isMe ? 'bg-indigo-50' : 'hover:bg-gray-50'} transition`}
              >
                <div className={`w-8 text-center font-bold text-sm ${
                  leader.rank === 1 ? 'text-yellow-500' :
                  leader.rank === 2 ? 'text-gray-400' :
                  leader.rank === 3 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : `#${leader.rank}`}
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0">
                  {leader.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${leader.isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {leader.name}
                    </span>
                    {leader.isMe && <span className="text-xs bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Lv.{leader.level} {LEVEL_TITLES[leader.level]} · {leader.streak_days}d streak 🔥</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-indigo-600">{leader.xp}</div>
                  <div className="text-xs text-gray-400">XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Only users who opted in are shown. Update your privacy settings to appear or hide.
      </p>
    </div>
  )
}
