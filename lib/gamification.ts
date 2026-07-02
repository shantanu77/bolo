import { query, execute, queryOne } from './db'
import { getLevelForXp } from './levels'

export { getLevelForXp, scoreToStars, LEVELS } from './levels'

export async function awardXp(userId: string, amount: number, reason: string): Promise<number> {
  await execute('UPDATE users SET xp = xp + ? WHERE id = ?', [amount, userId])

  const monthYear = new Date().toISOString().slice(0, 7)
  await execute(
    'INSERT INTO monthly_xp (id, user_id, month_year, xp) VALUES (UUID(), ?, ?, ?) ON DUPLICATE KEY UPDATE xp = xp + ?',
    [userId, monthYear, amount, amount]
  )

  const user = await queryOne<{ xp: number }>('SELECT xp FROM users WHERE id = ?', [userId])
  const totalXp = user?.xp ?? 0
  const { current } = getLevelForXp(totalXp)

  await execute('UPDATE users SET level = ? WHERE id = ?', [current.level, userId])

  console.log(`[XP] +${amount} to user ${userId}: ${reason}`)
  return totalXp
}

export async function updateStreak(userId: string): Promise<number> {
  const user = await queryOne<{ last_practiced: string | null; streak_days: number; streak_shield: number }>(
    'SELECT last_practiced, streak_days, streak_shield FROM users WHERE id = ?',
    [userId]
  )
  if (!user) return 0

  const today = new Date().toISOString().slice(0, 10)
  const lastPracticed = user.last_practiced?.toString().slice(0, 10)

  if (lastPracticed === today) return user.streak_days

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let newStreak: number

  if (lastPracticed === yesterday) {
    newStreak = user.streak_days + 1
  } else if (user.streak_shield > 0 && lastPracticed) {
    const daysBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
    if (lastPracticed === daysBefore) {
      newStreak = user.streak_days + 1
      await execute('UPDATE users SET streak_shield = streak_shield - 1 WHERE id = ?', [userId])
    } else {
      newStreak = 1
    }
  } else {
    newStreak = 1
  }

  await execute(
    'UPDATE users SET streak_days = ?, last_practiced = ? WHERE id = ?',
    [newStreak, today, userId]
  )

  if (newStreak === 7)  { await awardXp(userId, 50, '7-day streak'); await grantBadge(userId, 'week_warrior') }
  if (newStreak === 14) { await awardXp(userId, 100, '14-day streak'); await grantBadge(userId, 'fortnight') }
  if (newStreak === 30) { await awardXp(userId, 200, '30-day streak'); await grantBadge(userId, 'iron_habit') }
  if (newStreak === 60) { await awardXp(userId, 500, '60-day streak'); await grantBadge(userId, 'unstoppable') }

  return newStreak
}

export async function grantBadge(userId: string, slug: string): Promise<boolean> {
  const existing = await queryOne(
    'SELECT id FROM user_badges WHERE user_id = ? AND badge_slug = ?',
    [userId, slug]
  )
  if (existing) return false

  await execute(
    'INSERT INTO user_badges (id, user_id, badge_slug) VALUES (UUID(), ?, ?)',
    [userId, slug]
  )
  return true
}

export async function processSessionXp(
  userId: string,
  overallScore: number,
  isFirstSession: boolean,
  isNewScenario: boolean,
  isPersonalBest: boolean,
  isDaily: boolean,
  fillerCount: number,
): Promise<{ xpEarned: number; bonuses: string[]; newBadges: string[] }> {
  let xp = isDaily ? 15 : 10
  const bonuses: string[] = ['Completed session +' + (isDaily ? 15 : 10) + ' XP']

  if (overallScore > 85) { xp += 15; bonuses.push('Excellent score +15 XP') }
  else if (overallScore > 70) { xp += 5; bonuses.push('Good score +5 XP') }

  if (isNewScenario) { xp += 5; bonuses.push('New scenario explored +5 XP') }
  if (isPersonalBest) { xp += 10; bonuses.push('Personal best! +10 XP') }

  await awardXp(userId, xp, 'practice session')
  await updateStreak(userId)

  const newBadges: string[] = []
  if (isFirstSession && await grantBadge(userId, 'first_session')) newBadges.push('first_session')
  if (fillerCount === 0 && await grantBadge(userId, 'filler_free')) newBadges.push('filler_free')

  const [{ total_sessions }] = await query<{ total_sessions: number }>(
    'SELECT COUNT(*) as total_sessions FROM attempts WHERE user_id = ?',
    [userId]
  )
  if (total_sessions >= 50  && await grantBadge(userId, 'fifty_sessions')) newBadges.push('fifty_sessions')
  if (total_sessions >= 100 && await grantBadge(userId, 'century'))        newBadges.push('century')

  return { xpEarned: xp, bonuses, newBadges }
}
