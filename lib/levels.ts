export const LEVELS = [
  { level: 1,  title: 'First Word',    xpRequired: 0     },
  { level: 2,  title: 'Trying',        xpRequired: 100   },
  { level: 3,  title: 'Getting There', xpRequired: 300   },
  { level: 4,  title: 'Conversant',    xpRequired: 600   },
  { level: 5,  title: 'Confident',     xpRequired: 1000  },
  { level: 6,  title: 'Fluent',        xpRequired: 1800  },
  { level: 7,  title: 'Articulate',    xpRequired: 3000  },
  { level: 8,  title: 'Polished',      xpRequired: 5000  },
  { level: 9,  title: 'Eloquent',      xpRequired: 8000  },
  { level: 10, title: 'Masterclass',   xpRequired: 12000 },
]

export function getLevelForXp(xp: number) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl
    else break
  }
  const next = LEVELS.find(l => l.xpRequired > xp)
  return { current, next }
}

export function scoreToStars(score: number): number {
  if (score >= 85) return 5
  if (score >= 70) return 4
  if (score >= 56) return 3
  if (score >= 41) return 2
  return 1
}
