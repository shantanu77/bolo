import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { queryOne } from './db'

export interface DbUser {
  id: string
  name: string
  email: string
  password_hash: string
  subscription_tier: string
  subscription_ends: string | null
  xp: number
  level: number
  streak_days: number
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await queryOne<DbUser>(
          'SELECT * FROM users WHERE email = ?',
          [credentials.email.toLowerCase()]
        )
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null

        return {
          id:                user.id,
          name:              user.name,
          email:             user.email,
          subscription_tier: user.subscription_tier,
          subscription_ends: user.subscription_ends,
          xp:                user.xp,
          level:             user.level,
          streak_days:       user.streak_days,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn:  '/login',
    newUser: '/onboarding',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id                = user.id
        token.subscription_tier = (user as DbUser & { subscription_tier: string }).subscription_tier
        token.subscription_ends = (user as DbUser).subscription_ends
        token.xp                = (user as DbUser).xp
        token.level             = (user as DbUser).level
        token.streak_days       = (user as DbUser).streak_days
      }
      if (trigger === 'update' && typeof session?.user?.name === 'string') {
        token.name = session.user.name
      }
      if (trigger === 'update' && typeof session?.user?.subscription_tier === 'string') {
        token.subscription_tier = session.user.subscription_tier
      }
      if (trigger === 'update' && 'subscription_ends' in (session?.user ?? {})) {
        token.subscription_ends = session.user.subscription_ends
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id                = token.id as string
        session.user.subscription_tier = token.subscription_tier as string
        session.user.subscription_ends = token.subscription_ends as string | null
        session.user.xp                = token.xp as number
        session.user.level             = token.level as number
        session.user.streak_days       = token.streak_days as number
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
