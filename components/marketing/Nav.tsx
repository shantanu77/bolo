'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing',  label: 'Pricing'  },
  { href: '/about',    label: 'About'    },
]

export default function Nav() {
  const path    = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-indigo-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight">
          bolo<span className="text-indigo-400">.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm transition ${path === l.href ? 'text-white font-medium' : 'text-indigo-300 hover:text-white'}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-indigo-300 hover:text-white transition px-3 py-1.5">
            Login
          </Link>
          <Link href="/signup"
            className="text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-full transition">
            Start Free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-white p-1" onClick={() => setOpen(o => !o)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-indigo-950 border-t border-white/10 px-6 py-4 space-y-3">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm text-indigo-200 hover:text-white py-2 transition">
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <Link href="/login" className="text-sm text-center text-indigo-300 py-2">Login</Link>
            <Link href="/signup" className="text-sm text-center bg-indigo-500 text-white font-semibold py-2.5 rounded-xl">Start Free</Link>
          </div>
        </div>
      )}
    </header>
  )
}
