import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Bolo',
  description: 'Simple, affordable pricing for individual professionals and teams.',
}

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Get a feel for Bolo. No credit card, no commitment.',
    cta: 'Start for free',
    ctaHref: '/signup',
    highlight: false,
    features: [
      '5 practice sessions per month',
      '3 scenario categories',
      'Basic session scorecard',
      'Filler word detection',
      'XP and level system',
      'Leaderboard (read-only)',
    ],
    missing: [
      'Unlimited sessions',
      'AI-generated personalised categories',
      'Voice bio + profile building',
      'Full progress analytics',
      'Streak shield',
      'Weekly performance report',
    ],
  },
  {
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    desc: 'For professionals serious about improving their communication.',
    cta: 'Start Pro free for 7 days',
    ctaHref: '/signup',
    highlight: true,
    features: [
      'Unlimited practice sessions',
      'All scenario categories',
      'AI-generated personalised categories',
      'Voice bio — Bolo learns your profile',
      'Create unlimited custom categories by voice',
      'Full progress dashboard and analytics',
      'Leaderboard participation and ranking',
      '1 streak shield per month',
      'Weekly performance report',
      'Daily Challenge (+15 XP)',
      'Badge collection',
      'Priority support',
    ],
    missing: [],
  },
  {
    name: 'Teams',
    price: '₹299',
    period: 'per seat / month (min 5)',
    desc: 'For companies investing in their team\'s communication.',
    cta: 'Contact us',
    ctaHref: 'mailto:hello@bolo.in',
    highlight: false,
    features: [
      'Everything in Pro',
      'Admin dashboard',
      'Team progress reports',
      'Team leaderboard',
      'Custom scenarios for your organisation',
      'Onboarding support',
      'Dedicated account manager',
    ],
    missing: [],
  },
]

const FAQ = [
  {
    q: 'Is the free plan really free? No hidden charges?',
    a: 'Yes. The free plan is free forever. You get 5 sessions per month with no time limit on how long you stay on it. We will never charge your card without you explicitly upgrading.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, all major debit and credit cards, and net banking via Razorpay. All transactions are in INR.',
  },
  {
    q: 'Can I cancel my Pro subscription anytime?',
    a: 'Yes. You can cancel from your account settings at any time. Your Pro access continues until the end of the billing period.',
  },
  {
    q: 'What is a "streak shield"?',
    a: 'If you miss a day of practice, your streak shield is automatically consumed and your streak is preserved. Pro users get one shield per month. Without a shield, a missed day resets your streak to zero.',
  },
  {
    q: 'What is included in "AI-generated personalised categories"?',
    a: 'After you complete your profile (form or voice bio), Bolo generates 5–6 practice categories specifically for your role and industry — not generic ones. A product manager gets different scenarios than a sales professional.',
  },
  {
    q: 'How does the Teams plan work?',
    a: 'You buy seats in bulk (minimum 5). Each seat gets a full Pro account. The admin dashboard shows team-level progress, who is practising, which areas the team is weakest in, and team leaderboard standings.',
  },
  {
    q: 'Is there a student discount?',
    a: 'Yes — students with a valid college email get 50% off Pro. Email us at hello@bolo.in with your college ID.',
  },
]

export default function PricingPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Pricing</div>
          <h1 className="text-5xl font-bold mb-4">Simple. Affordable. No surprises.</h1>
          <p className="text-indigo-200 text-xl max-w-xl mx-auto">
            Less than one coaching session per month. Cancel any time.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-3xl border p-8 flex flex-col relative ${
                  plan.highlight
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105'
                    : 'border-gray-200 bg-white'
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-400 text-indigo-950 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <div className={`text-sm font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-500'}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className={`text-5xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm mb-2 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>
                </div>

                <Link href={plan.ctaHref}
                  className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 transition ${
                    plan.highlight
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}>
                  {plan.cta}
                </Link>

                <div className="flex-1">
                  <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>
                    Included
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-gray-700'}`}>
                        <span className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-indigo-300' : 'text-indigo-500'}`}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.missing.length > 0 && (
                    <>
                      <div className={`text-xs font-semibold uppercase tracking-widest mt-6 mb-3 ${plan.highlight ? 'text-indigo-300' : 'text-gray-300'}`}>
                        Not included
                      </div>
                      <ul className="space-y-2.5">
                        {plan.missing.map(f => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                            <span className="shrink-0 mt-0.5">–</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            All prices in INR. GST applicable. Student discount available —{' '}
            <a href="mailto:hello@bolo.in" className="text-indigo-500 hover:underline">email us</a>.
          </p>
        </div>
      </section>

      {/* Value comparison */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">What ₹499 compares to</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '🧑‍🏫', label: 'English tutor', price: '₹800–2,000', period: 'per hour', note: '1 session' },
              { icon: '📚', label: 'Grammar course', price: '₹2,000–5,000', period: 'one-time', note: 'No practice' },
              { icon: '🎤', label: 'Bolo Pro', price: '₹499', period: 'per month', note: 'Unlimited sessions', highlight: true },
            ].map(c => (
              <div key={c.label}
                className={`rounded-2xl p-6 border text-center ${c.highlight ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-gray-100'}`}>
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className={`font-semibold text-sm mb-1 ${c.highlight ? 'text-white' : 'text-gray-700'}`}>{c.label}</div>
                <div className={`text-2xl font-bold ${c.highlight ? 'text-white' : 'text-gray-900'}`}>{c.price}</div>
                <div className={`text-xs mt-1 ${c.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{c.period}</div>
                <div className={`text-xs mt-2 font-medium ${c.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQ.map(item => (
              <div key={item.q} className="border-b border-gray-100 pb-6">
                <h3 className="font-semibold text-gray-800 mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Start with the free plan today.</h2>
          <p className="text-indigo-200 mb-8">5 free sessions every month. No credit card required.</p>
          <Link href="/signup"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold rounded-xl text-lg hover:bg-indigo-50 transition shadow-xl">
            Create your free account →
          </Link>
        </div>
      </section>

    </div>
  )
}
