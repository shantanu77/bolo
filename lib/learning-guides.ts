import { randomUUID } from 'crypto'
import { execute, query, queryOne } from './db'

export interface StudyGuideContent {
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

export interface SavedLearningGuide {
  id: string
  user_id: string
  title: string
  topic: string | null
  dimension: string | null
  source_scenario_question: string | null
  evidence_json: unknown
  guide_json: StudyGuideContent
  created_at: string
  updated_at: string
}

export async function ensureLearningGuidesTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS learning_guides (
      id                       VARCHAR(36) PRIMARY KEY,
      user_id                  VARCHAR(36) NOT NULL,
      title                    VARCHAR(255) NOT NULL,
      topic                    VARCHAR(255),
      dimension                VARCHAR(50),
      source_scenario_question TEXT,
      evidence_json            JSON,
      guide_json               JSON NOT NULL,
      created_at               DATETIME NOT NULL DEFAULT NOW(),
      updated_at               DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_learning_guides_user_created (user_id, created_at),
      INDEX idx_learning_guides_dimension (dimension)
    )
  `)
}

export async function saveLearningGuide(params: {
  userId: string
  dimension: string
  topic: string
  scenarioQuestion: string
  evidence: string[]
  guide: StudyGuideContent
}) {
  await ensureLearningGuidesTable()

  const id = randomUUID()
  await execute(
    `INSERT INTO learning_guides
     (id, user_id, title, topic, dimension, source_scenario_question, evidence_json, guide_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.userId,
      params.guide.title || params.topic || 'AI Study Guide',
      params.topic || null,
      params.dimension || null,
      params.scenarioQuestion || null,
      JSON.stringify(params.evidence ?? []),
      JSON.stringify(params.guide),
    ],
  )

  return id
}

export async function listLearningGuides(userId: string) {
  await ensureLearningGuidesTable()

  const guides = await query<SavedLearningGuide>(
    `SELECT id, user_id, title, topic, dimension, source_scenario_question,
            evidence_json, guide_json, created_at, updated_at
     FROM learning_guides
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId],
  )

  return guides.map(normalizeLearningGuide)
}

export async function getLearningGuide(userId: string, guideId: string) {
  await ensureLearningGuidesTable()

  const guide = await queryOne<SavedLearningGuide>(
    `SELECT id, user_id, title, topic, dimension, source_scenario_question,
            evidence_json, guide_json, created_at, updated_at
     FROM learning_guides
     WHERE user_id = ? AND id = ?`,
    [userId, guideId],
  )

  return guide ? normalizeLearningGuide(guide) : null
}

function normalizeLearningGuide(row: SavedLearningGuide): SavedLearningGuide {
  return {
    ...row,
    evidence_json: parseJson(row.evidence_json, []),
    guide_json: parseJson(row.guide_json, {
      title: row.title,
      objective: '',
      lesson: [],
      examples: [],
      quick_rule: '',
      review_question: { prompt: '', expected_points: [] },
    }),
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value ?? fallback) as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
