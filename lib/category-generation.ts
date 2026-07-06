import { DeepgramClient } from '@deepgram/sdk'
import OpenAI from 'openai'
import { Readable } from 'stream'
import { execute, query, queryOne } from '@/lib/db'
import { parseJsonObject } from '@/lib/json'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface DgResponse { results?: { channels?: Array<{ alternatives?: Array<{ transcript: string }> }> } }

export interface CategoryGenerationJob {
  id: string
  user_id: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  input_type: 'text' | 'audio'
  user_request: string | null
  progress_step: string
  progress_percent: number
  category_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export async function ensureCategoryGenerationJobsTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS category_generation_jobs (
      id               VARCHAR(36) PRIMARY KEY,
      user_id          VARCHAR(36) NOT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending',
      input_type       VARCHAR(20) NOT NULL DEFAULT 'text',
      user_request     TEXT,
      progress_step    VARCHAR(255) NOT NULL DEFAULT 'Queued',
      progress_percent INT NOT NULL DEFAULT 0,
      category_id      VARCHAR(36),
      error_message    TEXT,
      created_at       DATETIME NOT NULL DEFAULT NOW(),
      updated_at       DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      INDEX idx_category_generation_jobs_user_status (user_id, status),
      INDEX idx_category_generation_jobs_category (category_id)
    )
  `)
}

export async function getCategoryGenerationJob(jobId: string, userId: string) {
  return queryOne<CategoryGenerationJob>(
    'SELECT * FROM category_generation_jobs WHERE id = ? AND user_id = ?',
    [jobId, userId]
  )
}

export async function getCategoryGenerationResult(categoryId: string) {
  const category = await queryOne(
    `SELECT uc.*, COUNT(us.id) as scenario_count
     FROM user_categories uc
     LEFT JOIN user_scenarios us ON us.category_id = uc.id AND us.is_active = 1
     WHERE uc.id = ?
     GROUP BY uc.id`,
    [categoryId]
  )
  const scenarios = await query(
    'SELECT * FROM user_scenarios WHERE category_id = ? ORDER BY sort_order',
    [categoryId]
  )

  return { category, scenarios }
}

export async function createCategoryGenerationJob(params: {
  userId: string
  inputType: 'text' | 'audio'
  userRequest?: string
}) {
  const jobId = crypto.randomUUID()
  await execute(
    `INSERT INTO category_generation_jobs
     (id, user_id, status, input_type, user_request, progress_step, progress_percent)
     VALUES (?, ?, 'pending', ?, ?, 'Queued', 5)`,
    [jobId, params.userId, params.inputType, params.userRequest ?? null]
  )
  return jobId
}

export function startCategoryGenerationJob(params: {
  jobId: string
  userId: string
  userRequest?: string
  audio?: Buffer
}) {
  setTimeout(() => {
    processCategoryGenerationJob(params).catch(error => {
      console.error('Category generation job failed', error)
    })
  }, 0)
}

async function processCategoryGenerationJob(params: {
  jobId: string
  userId: string
  userRequest?: string
  audio?: Buffer
}) {
  try {
    await updateJob(params.jobId, params.userId, 'processing', 'Preparing request', 10)

    let userRequest = params.userRequest ?? ''
    if (params.audio) {
      await updateJob(params.jobId, params.userId, 'processing', 'Transcribing voice note', 20)
      userRequest = await transcribeAudio(params.audio)
    }

    if (!userRequest || userRequest.length < 5) {
      throw new Error('Request too short')
    }

    await execute(
      'UPDATE category_generation_jobs SET user_request = ? WHERE id = ? AND user_id = ?',
      [userRequest, params.jobId, params.userId]
    )

    await updateJob(params.jobId, params.userId, 'processing', 'Designing the category', 40)
    const persona = await queryOne<{
      job_role: string; seniority: string; industry: string
      interacts_with: string; bio_structured: string | null
    }>('SELECT * FROM personas WHERE user_id = ?', [params.userId])

    const bioStructured = parseJsonObject(persona?.bio_structured)
    const result = await generateFromRequest(userRequest, persona, bioStructured)

    await updateJob(params.jobId, params.userId, 'processing', 'Saving category', 70)
    const catId = crypto.randomUUID()
    await execute(
      'INSERT INTO user_categories (id, user_id, name, description, icon, source, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [catId, params.userId, result.category.name, result.category.description, result.category.icon, 'user_requested',
       await getNextSortOrder(params.userId)]
    )

    await updateJob(params.jobId, params.userId, 'processing', 'Creating practice scenarios', 85)
    for (let i = 0; i < result.scenarios.length; i++) {
      const sc = result.scenarios[i]
      await execute(
        `INSERT INTO user_scenarios (id, user_id, category_id, title, context, question, register, vocab_level,
         comm_goal, common_mistakes, ideal_wpm_min, ideal_wpm_max, source, sort_order)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user_requested', ?)`,
        [
          params.userId, catId, sc.title, sc.context, sc.question,
          sc.register, sc.vocab_level, sc.comm_goal,
          JSON.stringify(sc.common_mistakes ?? []),
          sc.ideal_wpm_min ?? 110, sc.ideal_wpm_max ?? 140, i,
        ]
      )
    }

    await execute(
      `UPDATE category_generation_jobs
       SET status = 'succeeded', progress_step = 'Ready', progress_percent = 100, category_id = ?
       WHERE id = ? AND user_id = ?`,
      [catId, params.jobId, params.userId]
    )
  } catch (error) {
    await execute(
      `UPDATE category_generation_jobs
       SET status = 'failed', progress_step = 'Failed', progress_percent = 100, error_message = ?
       WHERE id = ? AND user_id = ?`,
      [error instanceof Error ? error.message : 'Failed to generate category', params.jobId, params.userId]
    )
  }
}

async function updateJob(
  jobId: string,
  userId: string,
  status: CategoryGenerationJob['status'],
  progressStep: string,
  progressPercent: number
) {
  await execute(
    `UPDATE category_generation_jobs
     SET status = ?, progress_step = ?, progress_percent = ?
     WHERE id = ? AND user_id = ?`,
    [status, progressStep, progressPercent, jobId, userId]
  )
}

async function transcribeAudio(audio: Buffer) {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! })
  const dgResponse = await deepgram.listen.v1.media.transcribeFile(
    Readable.from(audio),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { model: 'nova-2', language: 'en-IN', smart_format: true, punctuate: true } as any
  )
  const dgData = dgResponse as unknown as DgResponse
  return dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
}

async function getNextSortOrder(userId: string): Promise<number> {
  const res = await query<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM user_categories WHERE user_id = ?', [userId]
  )
  return (res[0]?.max_order ?? -1) + 1
}

async function generateFromRequest(
  userRequest: string,
  persona: Record<string, unknown> | null,
  bio: Record<string, unknown> | null
) {
  const personaCtx = [
    bio?.summary              && `Role summary: ${bio.summary}`,
    (bio?.current_role || persona?.job_role) && `Role: ${bio?.current_role ?? persona?.job_role}`,
    (bio?.seniority || persona?.seniority)   && `Seniority: ${bio?.seniority ?? persona?.seniority}`,
    bio?.industry             && `Industry: ${bio.industry}`,
  ].filter(Boolean).join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are creating custom English speaking practice scenarios for an Indian professional.

User profile:
${personaCtx || 'Profile not yet set.'}

The user has requested this type of practice:
"${userRequest}"

First, distil this into a clean category name and description.
Then create 3-4 specific, realistic scenarios tailored to this user's level and context.

Return a JSON object:
{
  "category": {
    "name": "<clean category name>",
    "description": "<1 sentence description>",
    "icon": "<single emoji>"
  },
  "scenarios": [
    {
      "title": "<scenario title>",
      "context": "<2-3 sentences setting the scene>",
      "question": "<the specific prompt or question to respond to>",
      "register": "formal|semi_formal|casual",
      "vocab_level": "professional|general|conversational",
      "comm_goal": "clarity|persuasion|empathy|confidence|structure|tone",
      "common_mistakes": ["<mistake 1>", "<mistake 2>"],
      "ideal_wpm_min": <number>,
      "ideal_wpm_max": <number>
    }
  ]
}

Make scenarios progressively challenging. Tailor to the user's seniority and industry.`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  return JSON.parse(completion.choices[0].message.content || '{}') as {
    category: { name: string; description: string; icon: string }
    scenarios: Array<{
      title: string; context: string; question: string; register: string
      vocab_level: string; comm_goal: string; common_mistakes: string[]
      ideal_wpm_min: number; ideal_wpm_max: number
    }>
  }
}
