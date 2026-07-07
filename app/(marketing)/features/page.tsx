import Link from 'next/link'
import type { Metadata } from 'next'
import { pageOpenGraph } from '@/lib/seo'

const PAGE_DESCRIPTION =
  'Voice-first onboarding, role-aware AI scenarios, 6-dimension evaluation, progress tracking, and gamification — everything AuraXpress does to help professionals communicate with clarity and confidence at work.'

export const metadata: Metadata = {
  title: 'Features',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/features' },
  openGraph: pageOpenGraph({ url: '/features', title: 'Features — AuraXpress', description: PAGE_DESCRIPTION }),
}

const CORE_FEATURES = [
  {
    id: 'voice-bio',
    icon: '🎙️',
    badge: 'Smart Onboarding',
    title: 'Speak about yourself. AuraXpress does the rest.',
    desc: `Most apps ask you to fill a form. AuraXpress asks you to speak for 60 seconds. Tell it your job, your responsibilities, who you interact with, and what challenges you face. Our AI structures everything automatically into a rich professional profile that shapes every scenario and evaluation you will ever receive.`,
    points: [
      'Record a 60-second voice introduction',
      'AI extracts role, seniority, industry, team context, communication challenges',
      'Your "evaluation lens" is set — a CTO is held to a different standard than a fresher',
      'Update your profile any time as your career evolves',
    ],
    reversed: false,
  },
  {
    id: 'scenarios',
    icon: '📋',
    badge: 'Personalised Content',
    title: 'Scenarios built for your exact job, not a generic professional.',
    desc: `AuraXpress does not give every user the same 10 exercises. After you set up your profile, our AI generates 5–6 practice categories and 15+ scenarios that are specific to your role, industry, seniority, and who you speak with. A startup founder gets investor pitches and customer sales conversations. A BPO agent gets empathy-building and call resolution scenarios.`,
    points: [
      'AI-generated categories tailored to your profession',
      'Scenarios cover your actual communication contexts',
      'Create any custom category by speaking or typing — "I want to practice salary negotiation"',
      'Global scenario library available for general practice',
    ],
    reversed: true,
  },
  {
    id: 'evaluation',
    icon: '🧠',
    badge: 'AI Evaluation',
    title: 'Not just a score — a mirror that shows you exactly what to fix.',
    desc: `After you speak, AuraXpress evaluates your response across 6 dimensions: Clarity, Fluency, Vocabulary, Structure, Confidence, and Tone. It gives you one specific improvement to focus on (not five), then speaks back a model response — what a confident professional in your exact role would have said in that situation.`,
    points: [
      'Scores on 6 communication dimensions (1–5 scale)',
      'Overall score out of 100',
      'One focused improvement per session — no overwhelm',
      'Model response spoken back in natural audio',
      'Filler word detection (um, basically, you know, so…)',
      'Speaking pace analysis with ideal WPM for the scenario type',
    ],
    reversed: false,
  },
  {
    id: 'progress',
    icon: '📈',
    badge: 'Progress Tracking',
    title: 'Know exactly where you are improving — and where to focus.',
    desc: `Every session is tracked. Scores per dimension, filler word trends, words per minute, XP earned, personal bests. The progress dashboard shows you which dimension is your weakest this month, which scenarios you have mastered, and where you rank against other professionals.`,
    points: [
      'Score trends across all 6 dimensions over time',
      'Filler word rate chart — watch it drop week by week',
      'Scenario mastery stars (1–5) per scenario',
      'Session history table with all metrics',
      'Weekly performance brief',
    ],
    reversed: true,
  },
  {
    id: 'gamification',
    icon: '🏆',
    badge: 'Gamification',
    title: 'Turn 10 minutes of daily practice into a habit you actually keep.',
    desc: `AuraXpress uses XP, levels, streaks, badges, and a monthly leaderboard to make practice feel less like a chore. The daily challenge gives everyone the same scenario — a shared experience that creates community. Streak shields mean you will not lose your 30-day streak over one missed day.`,
    points: [
      'XP earned per session, with bonuses for high scores and personal bests',
      '10 levels from "First Word" to "Masterclass"',
      'Daily streak with shield mechanic for Pro users',
      '15 badges across practice, skill, streak, and leaderboard categories',
      'Daily Challenge — same scenario for all users, +15 XP',
      'Monthly leaderboard that resets on the 1st',
    ],
    reversed: false,
  },
]

const EVAL_DIMENSIONS = [
  { name: 'Clarity',     icon: '💡', desc: 'Was the message easy to understand? Word choice and sentence structure.' },
  { name: 'Fluency',     icon: '🌊', desc: 'Flow of speech. Filler words, unnatural pauses, restarts.' },
  { name: 'Vocabulary',  icon: '📚', desc: 'Right words for the register? Any missed opportunities?' },
  { name: 'Structure',   icon: '🏗️', desc: 'Logical beginning, middle, end. Did the answer go somewhere?' },
  { name: 'Confidence',  icon: '💪', desc: 'Assertive delivery. No excessive hedging or apologetic framing.' },
  { name: 'Tone',        icon: '🎭', desc: 'Did the tone match the situation — formal, semi-formal, or casual?' },
]

export default function FeaturesPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-16 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Everything AuraXpress does</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">Features built for one thing</h1>
          <p className="text-lg sm:text-xl text-indigo-200 leading-relaxed">
            Making Indian professionals sound more confident, clear, and professional in English — in the exact situations they face at work.
          </p>
        </div>
      </section>

      {/* Core features */}
      {CORE_FEATURES.map(f => (
        <section key={f.id} id={f.id} className={`py-14 sm:py-20 px-6 ${f.reversed ? 'bg-gray-50' : 'bg-white'}`}>
          <div className="max-w-6xl mx-auto">
            <div className={`grid md:grid-cols-2 gap-16 items-center ${f.reversed ? 'md:flex-row-reverse' : ''}`}>
              <div className={f.reversed ? 'md:order-2' : ''}>
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  {f.badge}
                </div>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{f.title}</h2>
                <p className="text-gray-500 leading-relaxed mb-6">{f.desc}</p>
                <ul className="space-y-3">
                  {f.points.map(p => (
                    <li key={p} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="text-indigo-500 mt-0.5 shrink-0">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${f.reversed ? 'md:order-1' : ''} bg-indigo-950 rounded-3xl p-8 text-white`}>
                <div className="text-6xl text-center mb-6">{f.icon}</div>
                <div className="space-y-3">
                  {f.points.slice(0, 3).map(p => (
                    <div key={p} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-indigo-100">
                      <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Evaluation dimensions */}
      <section className="py-20 px-6 bg-indigo-950 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">The scorecard</div>
            <h2 className="text-4xl font-bold">6 dimensions. One clear picture.</h2>
            <p className="text-indigo-300 mt-4 max-w-xl mx-auto">
              Every response is evaluated across these six areas. You will always know exactly what to improve.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVAL_DIMENSIONS.map(d => (
              <div key={d.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
                <div className="text-3xl mb-3">{d.icon}</div>
                <div className="font-bold text-white mb-1.5">{d.name}</div>
                <p className="text-indigo-300 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Technology</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Built on best-in-class AI</h2>
          <p className="text-gray-500 mb-12 max-w-2xl mx-auto">
            AuraXpress combines real-time speech recognition tuned for Indian English with a large language model that understands professional context — so every session is transcribed accurately, evaluated intelligently, and answered back in a natural voice.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              { icon: '🎙️', title: 'Indian English speech recognition', desc: 'Best-in-class speech-to-text tuned for Indian English. Detects filler words, measures speaking pace.' },
              { icon: '🧠', title: 'Context-aware AI evaluation', desc: 'Understands your professional context, your seniority, and your specific scenario to give nuanced, role-aware feedback.' },
              { icon: '🔊', title: 'Natural voice responses', desc: 'All feedback and model responses are spoken back to you — so you hear what good sounds like, not just read it.' },
            ].map(t => (
              <div key={t.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-3">{t.icon}</div>
                <div className="font-semibold text-gray-800 mb-2 text-sm">{t.title}</div>
                <p className="text-gray-500 text-xs leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to try it yourself?</h2>
          <p className="text-indigo-200 mb-8">5 free sessions every month. No credit card needed.</p>
          <Link href="/signup"
            className="inline-block px-10 py-4 bg-white text-indigo-700 font-bold rounded-xl text-lg hover:bg-indigo-50 transition shadow-xl">
            Start practising free →
          </Link>
        </div>
      </section>

    </div>
  )
}
