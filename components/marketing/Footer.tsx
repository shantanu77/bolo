import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-indigo-950 border-t border-white/10 text-indigo-300">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="text-2xl font-bold text-white tracking-tight mb-3">
            bolo<span className="text-indigo-400">.</span>
          </div>
          <p className="text-sm leading-relaxed">
            AI-powered spoken English coaching for Indian professionals. Speak better. Sound confident. In any room.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Product</div>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
            <li><Link href="/pricing"  className="hover:text-white transition">Pricing</Link></li>
            <li><Link href="/signup"   className="hover:text-white transition">Get Started</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Company</div>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about"   className="hover:text-white transition">About</Link></li>
            <li><Link href="/about#mission" className="hover:text-white transition">Our Mission</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Support</div>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/login" className="hover:text-white transition">Login</Link></li>
            <li>
              <a href="mailto:hello@bolo.in" className="hover:text-white transition">hello@bolo.in</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-indigo-500">
        <span>© {new Date().getFullYear()} Bolo. Made with ♥ in India.</span>
        <div className="flex gap-5">
          <Link href="#" className="hover:text-indigo-300 transition">Privacy Policy</Link>
          <Link href="#" className="hover:text-indigo-300 transition">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
