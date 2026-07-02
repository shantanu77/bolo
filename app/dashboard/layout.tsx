'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { getLevelForXp } from '@/lib/levels'
import dynamic from 'next/dynamic'

const CoachChat = dynamic(() => import('@/components/CoachChat'), { ssr: false })

const NAV = [
  { href: '/dashboard',   label: 'Home',         icon: '🏠' },
  { href: '/practice',    label: 'Practice',     icon: '🎤' },
  { href: '/progress',    label: 'Progress',     icon: '📈' },
  { href: '/leaderboard', label: 'Leaderboard',  icon: '🏆' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { data: session } = useSession()
  const xp   = session?.user?.xp ?? 0
  const { current, next } = getLevelForXp(xp)
  const pct  = next ? Math.round(((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100) : 100

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-700 tracking-tight">
            bolo<span className="text-indigo-400">.</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href))
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>

        {/* User profile + logout */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-3">
          {/* Avatar + name + level */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{session?.user?.name}</div>
              <div className="text-xs text-indigo-500 font-medium">Lv.{current.level} · {current.title}</div>
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{xp} XP</span>
              {next && <span>{next.xpRequired} XP</span>}
            </div>
          </div>

          {/* Logout button — prominent */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>

      {/* Floating AI coaching chatbot */}
      <CoachChat />
    </div>
  )
}
