import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Bolo',
  description: 'Why we built Bolo, and who we built it for.',
}

const VALUES = [
  {
    icon: '🇮🇳',
    title: 'Indian English is valid English',
    desc: 'We do not correct users toward an American or British accent. Bolo helps you speak clearly and confidently in Indian English — the way hundreds of millions of people use it every day in professional settings.',
  },
  {
    icon: '🎯',
    title: 'Context over correction',
    desc: 'The goal is not perfect grammar. It is appropriate, clear, confident communication for the specific situation you are in — whether that is a client call, a board meeting, or a job interview.',
  },
  {
    icon: '📈',
    title: 'Practice over theory',
    desc: 'You do not get better at speaking by reading about speaking. Every Bolo session is active practice — you speak, you get feedback, you hear what better sounds like, and you try again.',
  },
  {
    icon: '🤝',
    title: 'Respectful, not condescending',
    desc: 'Our users are smart, experienced professionals who communicate in two or more languages every day. Bolo treats them accordingly — as capable people who just need context-specific practice, not remedial help.',
  },
]

const TEAM = [
  {
    name: 'Shantanu',
    role: 'Founder & CEO',
    bio: 'Product builder who has spent years working with Indian professionals in enterprise and startup settings. Saw the same confidence gap repeatedly — technically brilliant people held back by communication, not capability.',
    avatar: 'S',
    color: 'bg-indigo-100 text-indigo-700',
  },
]

const TIMELINE = [
  { year: '2024 Q3', event: 'Problem identified — too many great engineers and managers held back by communication confidence, not skill.' },
  { year: '2024 Q4', event: 'First prototype: voice input → GPT evaluation → feedback. Tested with 50 users in Bangalore.' },
  { year: '2025 Q1', event: 'Built the persona system and personalised scenario generation. Deepgram en-IN integration.' },
  { year: '2025 Q2', event: 'Added gamification (XP, streaks, leaderboard) and the daily challenge. 500 beta users.' },
  { year: '2025 Q3', event: 'Voice bio — users can speak their professional profile instead of filling a form. 2,000+ users.' },
  { year: 'Now',     event: 'Growing the scenario library, refining feedback quality, expanding to Team plans.' },
]

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Our story</div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            We built Bolo because we saw the gap.
          </h1>
          <p className="text-xl text-indigo-200 max-w-2xl leading-relaxed">
            Some of the sharpest professionals we know — engineers, managers, founders — were being underestimated in meetings and on calls. Not because they lacked ideas. Because the way they expressed those ideas in English did not match their actual capability.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="py-24 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Our mission</div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Close the gap between how good you are and how good you sound.</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              India has over 125 million English speakers. Most of them use English every day at work. Most of them are completely capable communicators — in their native language. The gap is context: English at work often means a different register, a different structure, a different pace.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Bolo exists to close that gap through practice, not theory. Real scenarios. Real feedback. Spoken out loud. Tailored to your job, your industry, and the specific situations where you need to perform.
            </p>
          </div>
          <div className="bg-indigo-50 rounded-3xl p-10 text-center">
            <div className="text-6xl mb-4">🎤</div>
            <div className="text-4xl font-bold text-indigo-700 mb-2">125M+</div>
            <div className="text-gray-500 text-sm">English speakers in India — most already fluent, many held back by confidence in professional contexts.</div>
            <div className="mt-8 pt-8 border-t border-indigo-100">
              <div className="text-3xl font-bold text-indigo-700 mb-2">15%</div>
              <div className="text-gray-500 text-sm">Average score improvement after 4 weeks of daily practice on Bolo.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Indian English */}
      <section className="py-20 px-6 bg-indigo-950 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Our philosophy</div>
            <h2 className="text-4xl font-bold mb-4">We are not trying to make you sound American.</h2>
            <p className="text-indigo-300 text-lg max-w-2xl mx-auto">
              Indian English is a valid, legitimate variety of English. It has its own patterns, rhythms, and expressions. Our job is not to eliminate your accent or your background — it is to help you be understood, respected, and confident in any professional room.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {[
              { title: 'What Bolo helps with', items: ['Clarity and sentence structure', 'Filler word reduction (um, basically, you know)', 'Speaking pace and pausing', 'Choosing the right register (formal vs. casual)', 'Structuring your answers (beginning, middle, end)', 'Confidence in being direct'] },
              { title: 'What Bolo does not touch', items: ['Your accent', 'Your regional expressions that are clear and correct', 'Your personality and natural speaking style', 'Words that are valid Indian English', 'Your background or where you are from'] },
            ].map(s => (
              <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="font-semibold text-white mb-4 text-sm">{s.title}</div>
                <ul className="space-y-2">
                  {s.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-indigo-200">
                      <span className="text-indigo-400 mt-0.5 shrink-0">{s.title.includes('not') ? '○' : '✓'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">What we believe</div>
            <h2 className="text-4xl font-bold text-gray-900">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{v.title}</h3>
                <p className="text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">How we got here</div>
            <h2 className="text-4xl font-bold text-gray-900">The Bolo story</h2>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-indigo-100" />
            <div className="space-y-8 pl-12">
              {TIMELINE.map(item => (
                <div key={item.year} className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-indigo-50" />
                  <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">{item.year}</div>
                  <p className="text-gray-600 leading-relaxed">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">The team</div>
            <h2 className="text-4xl font-bold text-gray-900">Built by people who know this problem firsthand</h2>
          </div>
          <div className="flex justify-center">
            {TEAM.map(member => (
              <div key={member.name} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-sm w-full text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 ${member.color}`}>
                  {member.avatar}
                </div>
                <div className="font-bold text-gray-900 text-xl mb-1">{member.name}</div>
                <div className="text-indigo-600 text-sm font-medium mb-4">{member.role}</div>
                <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12 text-gray-400 text-sm">
            We are a small, focused team building Bolo in India, for India. <br />
            If you want to work with us, write to{' '}
            <a href="mailto:hello@bolo.in" className="text-indigo-500 hover:underline">hello@bolo.in</a>.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to close the gap?</h2>
          <p className="text-indigo-200 mb-8">Start for free. No credit card. 2 minutes to set up.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
              className="px-8 py-4 bg-white text-indigo-700 font-bold rounded-xl text-lg hover:bg-indigo-50 transition shadow-xl">
              Start practising free →
            </Link>
            <Link href="/features"
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl text-lg hover:bg-white/20 transition">
              See how it works
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
