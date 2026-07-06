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
  source_scenario_id: string | null
  source_scenario_type: string | null
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
      source_scenario_id       VARCHAR(36),
      source_scenario_type     VARCHAR(20),
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

  await ensureColumn('source_scenario_id', 'VARCHAR(36)')
  await ensureColumn('source_scenario_type', 'VARCHAR(20)')
}

export async function saveLearningGuide(params: {
  userId: string
  dimension: string
  topic: string
  scenarioId?: string
  scenarioType?: string
  scenarioQuestion: string
  evidence: string[]
  guide: StudyGuideContent
}) {
  await ensureLearningGuidesTable()

  const id = randomUUID()
  await execute(
    `INSERT INTO learning_guides
     (id, user_id, title, topic, dimension, source_scenario_id, source_scenario_type, source_scenario_question, evidence_json, guide_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.userId,
      params.guide.title || params.topic || 'AI Study Guide',
      params.topic || null,
      params.dimension || null,
      params.scenarioId || null,
      params.scenarioType || null,
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
    `SELECT id, user_id, title, topic, dimension, source_scenario_id, source_scenario_type, source_scenario_question,
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
    `SELECT id, user_id, title, topic, dimension, source_scenario_id, source_scenario_type, source_scenario_question,
            evidence_json, guide_json, created_at, updated_at
     FROM learning_guides
     WHERE user_id = ? AND id = ?`,
    [userId, guideId],
  )

  return guide ? normalizeLearningGuide(guide) : null
}

export async function getExistingLearningGuideForSource(params: {
  userId: string
  scenarioId: string
  scenarioType: string
  dimension: string
}) {
  await ensureLearningGuidesTable()

  const guide = await queryOne<SavedLearningGuide>(
    `SELECT id, user_id, title, topic, dimension, source_scenario_id, source_scenario_type, source_scenario_question,
            evidence_json, guide_json, created_at, updated_at
     FROM learning_guides
     WHERE user_id = ?
       AND source_scenario_id = ?
       AND source_scenario_type = ?
       AND dimension = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.userId, params.scenarioId, params.scenarioType, params.dimension],
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

async function ensureColumn(columnName: string, columnType: string) {
  const existing = await queryOne<{ column_count: number }>(
    `SELECT COUNT(*) as column_count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'learning_guides'
       AND COLUMN_NAME = ?`,
    [columnName],
  )

  if ((existing?.column_count ?? 0) === 0) {
    await execute(`ALTER TABLE learning_guides ADD COLUMN ${columnName} ${columnType}`)
  }
}
