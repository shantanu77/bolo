import Link from 'next/link'

const STATS = [
  { value: '10,000+', label: 'Practice sessions' },
  { value: '2,000+',  label: 'Indian professionals' },
  { value: '15%',     label: 'Avg score improvement in 4 weeks' },
  { value: '4.8★',    label: 'User rating' },
]

const PROBLEMS = [
  { icon: '😰', text: 'You know what to say — but hesitate or say "basically" too often on calls' },
  { icon: '😶', text: 'You sound confident in Hindi or your native language, but stiff in English' },
  { icon: '🫤', text: 'International clients sometimes ask you to repeat yourself' },
  { icon: '🎯', text: 'You want to lead meetings and present well, but English feels like a barrier' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Build your profile',
    desc: 'Tell Bolo about your job, who you speak with, and what you want to improve. Or just record a 60-second voice intro and Bolo will figure it out for you.',
    icon: '👤',
  },
  {
    step: '02',
    title: 'Practice with realistic scenarios',
    desc: 'Bolo generates scenarios tailored to your role — client calls for IT professionals, investor pitches for founders, interviews for freshers. Speak your answer freely.',
    icon: '🎤',
  },
  {
    step: '03',
    title: 'Get scored, then hear a better version',
    desc: 'See your score across 6 dimensions. Hear exactly what you could have said instead — spoken back to you naturally.',
    icon: '📈',
  },
]

const FEATURES_PREVIEW = [
  {
    icon: '🧠',
    title: 'AI that actually knows your role',
    desc: 'A CTO practising board communication is evaluated differently from a fresher preparing for interviews. Bolo calibrates to your specific professional context.',
  },
  {
    icon: '🗣️',
    title: 'Voice in, voice out',
    desc: 'Speak your answer. Hear the feedback. Hear a model response. Everything is audio — no reading scripts, no multiple choice.',
  },
  {
    icon: '🏏',
    title: 'Gamification that keeps you coming back',
    desc: 'XP, streaks, badges, a daily challenge, leaderboards — Bolo makes 10 minutes of daily practice feel like a habit, not homework.',
  },
  {
    icon: '📊',
    title: 'Progress you can see',
    desc: 'Track clarity, fluency, vocabulary, structure, confidence, and tone over time. Know exactly which dimension to focus on this week.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Priya Menon',
    role: 'Senior Software Engineer, Bangalore',
    text: 'After 3 weeks of daily practice, my US client stopped asking me to repeat myself. That was the moment I knew Bolo was working.',
    avatar: 'P',
    color: 'bg-pink-100 text-pink-700',
  },
  {
    name: 'Rahul Agarwal',
    role: 'Product Manager, Hyderabad',
    text: "The daily challenge is addictive. My 22-day streak is the longest I have stuck with any learning app. And my standup updates are actually concise now.",
    avatar: 'R',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Kavitha Srinivasan',
    role: 'Startup Founder, Chennai',
    text: 'I recorded my 60-second bio and Bolo immediately generated investor pitch scenarios. That level of personalisation is something I have not seen anywhere else.',
    avatar: 'K',
    color: 'bg-green-100 text-green-700',
  },
]

const WHO_FOR = [
  { title: 'IT Professionals',    icon: '💻', desc: 'Sound polished on international calls, sprint ceremonies, and client status updates.' },
  { title: 'MBA Students',         icon: '🎓', desc: 'Ace group discussions, case interviews, and placement season with confidence.' },
  { title: 'Sales Professionals',  icon: '📣', desc: 'Close deals faster with persuasive, clear, well-structured pitches.' },
  { title: 'Founders',             icon: '🚀', desc: 'Pitch investors, win customers, and lead all-hands with executive presence.' },
  { title: 'Managers & Leaders',   icon: '🏢', desc: 'Give feedback, run meetings, and speak to leadership with authority.' },
  { title: 'BPO & Support',        icon: '📞', desc: 'Sound natural, not scripted. Build rapport and resolve issues efficiently.' },
]

export default function HomePage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white min-h-[88vh] flex flex-col justify-center px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-indigo-200 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Built specifically for Indian professionals
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Speak English<br />
              <span className="text-indigo-300">like you mean it.</span>
            </h1>

            <p className="text-xl text-indigo-200 max-w-xl leading-relaxed mb-10">
              Bolo listens to you speak, evaluates your response, and plays back a better version — tailored to your job, your industry, and your communication goals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/signup"
                className="px-8 py-4 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 font-bold rounded-xl transition text-lg text-center">
                Start practising free →
              </Link>
              <Link href="/features"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition text-lg text-center">
                See how it works
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {STATS.map(s => (
                <div key={s.label}>
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-indigo-300 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Sound familiar?</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Great at your job. Less confident in English.</h2>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            You are smart, experienced, and capable — but something holds you back when you switch to English. You are not alone. This is one of the most common challenges for Indian professionals.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {PROBLEMS.map(p => (
              <div key={p.text} className="flex gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <span className="text-3xl shrink-0">{p.icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-gray-400 text-sm">
            Bolo does not fix your accent. It makes you clearer, more confident, and better-suited for every professional situation.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Simple loop. Real results.</div>
            <h2 className="text-4xl font-bold text-gray-900">How Bolo works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-indigo-100 -translate-x-8" />
                )}
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl mb-5">{s.icon}</div>
                <div className="text-xs font-bold text-indigo-400 tracking-widest mb-2">{s.step}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 bg-indigo-950 rounded-3xl p-10 text-white text-center">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-xl font-semibold mb-2">The entire experience is voice-first.</p>
            <p className="text-indigo-300 max-w-lg mx-auto">No typing. No multiple choice. You speak, Bolo listens, evaluates, and speaks back. Just like a real coach — available 24/7.</p>
          </div>
        </div>
      </section>

      {/* Features preview */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">What makes Bolo different</div>
            <h2 className="text-4xl font-bold text-gray-900">Not a language app. A communication coach.</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Duolingo teaches grammar. Bolo teaches you to sound confident in a Monday morning standup. That is a very different thing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES_PREVIEW.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/features" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition">
              Explore all features →
            </Link>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Built for your context</div>
            <h2 className="text-4xl font-bold text-gray-900">Who practises on Bolo?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHO_FOR.map(w => (
              <div key={w.title} className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition group">
                <span className="text-3xl shrink-0">{w.icon}</span>
                <div>
                  <div className="font-semibold text-gray-800 mb-1.5 group-hover:text-indigo-700 transition">{w.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-indigo-950 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Real users, real improvement</div>
            <h2 className="text-4xl font-bold">What Bolo users say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/10 transition">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-indigo-100 leading-relaxed mb-6 text-sm">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${t.color}`}>{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t.name}</div>
                    <div className="text-indigo-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Pricing</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Start free. Upgrade when you are ready.</h2>
          <p className="text-gray-500 mb-8 text-lg">
            5 free practice sessions every month, no credit card needed.<br />
            Pro is <strong className="text-gray-700">₹499/month</strong> — less than a single coaching session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">
              Start free — no card needed
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition">
              See all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            10 minutes a day.<br />Speak better in 2 weeks.
          </h2>
          <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of Indian professionals already practising with Bolo. No accent changes. No grammar drills. Just real scenarios, real feedback, real improvement.
          </p>
          <Link href="/signup"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold rounded-xl text-lg hover:bg-indigo-50 transition shadow-xl">
            Start practising for free →
          </Link>
          <p className="text-indigo-300 text-sm mt-4">Free forever plan · No credit card · Takes 2 minutes to set up</p>
        </div>
      </section>

    </div>
  )
}
