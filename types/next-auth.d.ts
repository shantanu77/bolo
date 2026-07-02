import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    subscription_tier: string
    xp: number
    level: number
    streak_days: number
  }
  interface Session {
    user: User & {
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    subscription_tier: string
    xp: number
    level: number
    streak_days: number
  }
}
