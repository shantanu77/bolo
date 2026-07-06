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
  { href: '/billing',     label: 'Billing',      icon: '💳' },
  { href: '/profile',     label: 'Profile',      icon: '⚙️' },
]
const ADMIN_NAV = { href: '/superadmin', label: 'Admin', icon: '🛠️' }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { data: session } = useSession()
  const xp   = session?.user?.xp ?? 0
  const { current, next } = getLevelForXp(xp)
  const pct  = next ? Math.round(((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100) : 100
  const navItems = session?.user?.user_role === 'superadmin' ? [...NAV, ADMIN_NAV] : NAV

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-700 tracking-tight shrink-0">
            Aura<span className="text-indigo-400">Xpress</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="px-2 pb-2 flex gap-1 overflow-x-auto">
          {navItems.map(n => (
            <Link key={n.href} href={n.href}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href))
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </header>

      <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-700 tracking-tight">
            Aura<span className="text-indigo-400">Xpress</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(n => (
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
          <Link href="/profile" className="flex items-center gap-2.5 rounded-lg p-1 -m-1 hover:bg-gray-50 transition">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{session?.user?.name}</div>
              <div className="text-xs text-indigo-500 font-medium">Lv.{current.level} · {current.title}</div>
            </div>
          </Link>

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

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>

      {/* Floating AI coaching chatbot */}
      <CoachChat />
    </div>
  )
}
