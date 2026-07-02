'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 'role',       title: 'Tell us about your work' },
  { id: 'interact',   title: 'Who do you speak English with?' },
  { id: 'goals',      title: 'What do you want to improve?' },
]

const SENIORITY_OPTIONS = ['Fresher / Intern', 'Junior (1-3 years)', 'Mid-level (3-6 years)', 'Senior (6+ years)', 'Manager / Lead', 'Director+', 'Student', 'Entrepreneur']
const INDUSTRY_OPTIONS  = ['IT / Software', 'BPO / Customer Support', 'Finance / Banking', 'Sales / Business Dev', 'Healthcare', 'Education', 'Startup', 'Manufacturing', 'Other']
const SIZE_OPTIONS      = ['Startup (< 50)', 'SME (50–500)', 'Large (500–5000)', 'MNC (5000+)']

const INTERACT_OPTIONS = [
  { id: 'international_clients', label: 'International clients (US / UK)' },
  { id: 'domestic_clients',      label: 'Domestic clients' },
  { id: 'team',                  label: 'My team / reports' },
  { id: 'leadership',            label: 'My manager / leadership' },
  { id: 'social',                label: 'Friends and social settings' },
  { id: 'recruiters',            label: 'Interviewers / recruiters' },
]
const CHALLENGE_OPTIONS = [
  { id: 'fillers',       label: 'I pause or say "um" too much' },
  { id: 'long_sentences',label: 'My sentences are too long or unclear' },
  { id: 'mti',           label: 'I mix Hindi words without realising' },
  { id: 'too_informal',  label: 'I sound too informal in professional settings' },
  { id: 'too_stiff',     label: 'I sound too stiff in casual settings' },
  { id: 'structure',     label: 'I struggle to structure my thoughts quickly' },
  { id: 'pronunciation', label: 'My pronunciation is hard to understand' },
  { id: 'confidence',    label: 'I lose confidence when challenged' },
]
const GOAL_OPTIONS = [
  { id: 'interview',     label: 'Crack a job interview' },
  { id: 'client_calls',  label: 'Sound confident on client calls' },
  { id: 'lead_meetings', label: 'Lead team meetings effectively' },
  { id: 'office_daily',  label: 'Improve day-to-day office communication' },
  { id: 'public_speak',  label: 'Prepare for public speaking or presentations' },
  { id: 'general',       label: 'General fluency improvement' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    native_language: 'Hindi',
    job_role:        '',
    seniority:       '',
    industry:        '',
    company_size:    '',
    interacts_with:  [] as string[],
    challenges:      [] as string[],
    goals:           [] as string[],
  })

  function toggle(field: 'interacts_with' | 'challenges' | 'goals', id: string) {
    setForm(p => {
      const arr = p[field]
      return { ...p, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] }
    })
  }

  async function handleFinish() {
    setLoading(true)
    await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    // Trigger AI category generation in the background (non-blocking)
    fetch('/api/generate/categories', { method: 'POST' }).catch(() => null)
    router.push('/dashboard')
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-3xl font-bold text-white tracking-tight">bolo.</span>
          <p className="text-indigo-300 mt-1 text-sm">Step {step + 1} of {STEPS.length}</p>
        </div>

        <div className="h-1.5 bg-white/10 rounded-full mb-6">
          <div className="h-1.5 bg-indigo-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">{STEPS[step].title}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your job role</label>
                <input
                  type="text" value={form.job_role}
                  onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="e.g. Software Engineer, Product Manager, Sales Lead"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seniority level</label>
                <div className="grid grid-cols-2 gap-2">
                  {SENIORITY_OPTIONS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(p => ({ ...p, seniority: s }))}
                      className={`px-3 py-2 rounded-lg text-sm border transition ${form.seniority === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRY_OPTIONS.map(i => (
                    <button key={i} type="button"
                      onClick={() => setForm(p => ({ ...p, industry: i }))}
                      className={`px-3 py-2 rounded-lg text-sm border transition ${form.industry === i ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                    >{i}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company size</label>
                <div className="grid grid-cols-2 gap-2">
                  {SIZE_OPTIONS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(p => ({ ...p, company_size: s }))}
                      className={`px-3 py-2 rounded-lg text-sm border transition ${form.company_size === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
              {INTERACT_OPTIONS.map(o => (
                <button key={o.id} type="button"
                  onClick={() => toggle('interacts_with', o.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm ${form.interacts_with.includes(o.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-indigo-200'}`}
                >
                  {form.interacts_with.includes(o.id) ? '✓ ' : ''}{o.label}
                </button>
              ))}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">My biggest challenges</p>
                {CHALLENGE_OPTIONS.map(o => (
                  <button key={o.id} type="button"
                    onClick={() => toggle('challenges', o.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm mb-2 ${form.challenges.includes(o.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-indigo-200'}`}
                  >
                    {form.challenges.includes(o.id) ? '✓ ' : ''}{o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">What are you primarily practicing for?</p>
              {GOAL_OPTIONS.map(o => (
                <button key={o.id} type="button"
                  onClick={() => toggle('goals', o.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm ${form.goals.includes(o.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-indigo-200'}`}
                >
                  {form.goals.includes(o.id) ? '✓ ' : ''}{o.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="px-5 py-2.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
              >
                {loading ? 'Saving…' : "Let's go!"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-indigo-400 text-xs mt-4">
          You can update this profile anytime
        </p>
      </div>
    </div>
  )
}
