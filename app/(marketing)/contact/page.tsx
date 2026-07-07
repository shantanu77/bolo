import type { Metadata } from 'next'
import { pageOpenGraph } from '@/lib/seo'

const PAGE_DESCRIPTION = 'Get in touch with the AuraXpress team for support, partnerships, Teams plan enquiries, or press.'

export const metadata: Metadata = {
  title: 'Contact',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: pageOpenGraph({ url: '/contact', title: 'Contact — AuraXpress', description: PAGE_DESCRIPTION }),
}

const CHANNELS = [
  {
    icon: '💬',
    title: 'General support',
    desc: 'Questions about your account, a practice session, or a billing issue.',
    email: 'helloaura@auraxpress.com',
  },
  {
    icon: '🏢',
    title: 'Teams & enterprise',
    desc: 'Rolling out AuraXpress to your team or organisation — seats, admin dashboard, custom scenarios.',
    email: 'helloaura@auraxpress.com',
  },
  {
    icon: '📰',
    title: 'Press & partnerships',
    desc: 'Media enquiries, collaborations, or integration partnerships.',
    email: 'helloaura@auraxpress.com',
  },
]

export default function ContactPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-16 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Get in touch</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">We read every message.</h1>
          <p className="text-lg text-indigo-200 leading-relaxed">
            AuraXpress is a small, focused team building out of Bangalore, India. Reach out for support,
            partnerships, or anything else — we typically reply within one business day.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          {CHANNELS.map(c => (
            <div key={c.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm text-center">
              <div className="text-3xl mb-4">{c.icon}</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{c.title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">{c.desc}</p>
              <a
                href={`mailto:${c.email}`}
                className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                {c.email} →
              </a>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-16 bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Have a quick question?</h2>
          <p className="text-gray-500 text-sm">
            Check our <a href="/pricing#faq" className="text-indigo-600 hover:underline">frequently asked questions</a> — billing,
            plans, streak shields, and Teams onboarding are all covered there.
          </p>
        </div>
      </section>
    </div>
  )
}
