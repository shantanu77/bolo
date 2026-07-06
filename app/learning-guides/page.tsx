'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface StudyGuide {
  title: string
  objective: string
  lesson: Array<{ heading: string; body: string }>
  examples: Array<{ weak: string; better: string; why: string }>
  quick_rule: string
  review_question: {
    prompt: string
    expected_points: string[]
  }
}

interface SavedGuide {
  id: string
  title: string
  topic: string | null
  dimension: string | null
  source_scenario_id: string | null
  source_scenario_type: string | null
  source_scenario_question: string | null
  evidence_json: string[]
  guide_json: StudyGuide
  created_at: string
}

function LearningGuidesContent() {
  const searchParams = useSearchParams()
  const requestedGuide = searchParams.get('guide')
  const [guides, setGuides] = useState<SavedGuide[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReviewQuestion, setShowReviewQuestion] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/learning-guides')
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load learning guides.')
        return data.guides as SavedGuide[]
      })
      .then(items => {
        if (!mounted) return
        setGuides(items)
        setSelectedId(requestedGuide && items.some(item => item.id === requestedGuide) ? requestedGuide : items[0]?.id ?? '')
      })
      .catch(err => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Could not load learning guides.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [requestedGuide])

  useEffect(() => {
    setShowReviewQuestion(false)
  }, [selectedId])

  const selected = useMemo(
    () => guides.find(guide => guide.id === selectedId) ?? null,
    [guides, selectedId],
  )
  const reviewScenarioHref = selected?.source_scenario_id
    ? `/practice/${selected.source_scenario_id}?type=${selected.source_scenario_type === 'user' ? 'user' : 'global'}`
    : ''

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading learning guides...</div>

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto lg:mx-0">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto lg:mx-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Learning Guide</h1>
          <p className="mt-1 text-sm text-gray-500">Saved AI guides from your response reviews.</p>
        </div>
        <Link
          href="/practice"
          className="inline-flex w-fit items-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          Practice more
        </Link>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">No saved guides yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            After reviewing a response, press the AI Guide button on any score section. The generated guide will be saved here for later revision.
          </p>
          <Link
            href="/practice"
            className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start practice
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-2">
            {guides.map(guide => (
              <button
                key={guide.id}
                type="button"
                onClick={() => setSelectedId(guide.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === guide.id
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-gray-100 bg-white hover:border-indigo-100 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{guide.title}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {guide.dimension && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-600">{guide.dimension}</span>}
                  {guide.topic && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">{guide.topic}</span>}
                </div>
                <div className="mt-2 text-xs text-gray-400">{formatGuideDate(guide.created_at)}</div>
              </button>
            ))}
          </aside>

          {selected && (
            <main className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{selected.dimension ?? 'AI Study Guide'}</div>
                <h2 className="mt-1 text-xl font-bold text-gray-800">{selected.guide_json.title || selected.title}</h2>
                {selected.topic && <p className="mt-1 text-sm text-gray-500">{selected.topic}</p>}
              </div>

              {selected.source_scenario_question && (
                <div className="mb-5 rounded-xl bg-gray-50 p-4">
                  <div className="mb-1 text-xs font-semibold text-gray-400">Original scenario</div>
                  <p className="text-sm leading-relaxed text-gray-700">{selected.source_scenario_question}</p>
                </div>
              )}

              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-gray-600">{selected.guide_json.objective}</p>

                <div className="grid gap-3">
                  {selected.guide_json.lesson?.map(section => (
                    <div key={section.heading} className="rounded-xl bg-gray-50 p-4">
                      <div className="text-sm font-semibold text-gray-800">{section.heading}</div>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{section.body}</p>
                    </div>
                  ))}
                </div>

                {selected.guide_json.examples?.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-semibold text-gray-800">Examples</div>
                    <div className="grid gap-3">
                      {selected.guide_json.examples.map((example, idx) => (
                        <div key={`${example.weak}-${idx}`} className="rounded-xl border border-gray-100 p-4">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-semibold text-gray-400">Weak</div>
                              <p className="text-sm text-gray-600">&quot;{example.weak}&quot;</p>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold text-green-600">Better</div>
                              <p className="text-sm font-medium text-gray-800">&quot;{example.better}&quot;</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">{example.why}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.guide_json.quick_rule && (
                  <div className="rounded-xl bg-indigo-50 p-4 text-sm font-medium text-indigo-800">
                    {selected.guide_json.quick_rule}
                  </div>
                )}

                {selected.evidence_json?.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-semibold text-gray-800">Your original phrases</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.evidence_json.map(quote => (
                        <span key={quote} className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                          &quot;{quote}&quot;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  {reviewScenarioHref ? (
                    <Link
                      href={reviewScenarioHref}
                      className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Review my learning
                    </Link>
                  ) : !showReviewQuestion ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowReviewQuestion(true)}
                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Review my learning
                      </button>
                      <p className="mt-2 text-center text-xs text-gray-400">
                        This older guide does not have the original scenario link saved.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">Practice question</div>
                      <p className="text-sm font-semibold text-gray-800">{selected.guide_json.review_question?.prompt}</p>
                      {selected.guide_json.review_question?.expected_points?.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 text-xs font-semibold text-gray-500">Your answer should include</div>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {selected.guide_json.review_question.expected_points.map(point => (
                              <li key={point}>- {point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  )
}

function formatGuideDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

export default function LearningGuidesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>}>
      <LearningGuidesContent />
    </Suspense>
  )
}
