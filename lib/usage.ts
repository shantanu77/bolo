import { execute } from './db'

// Usage estimates in USD per 1M tokens/chars, updated July 2026.
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':       { input: 2.50, output: 10.00 },
  'gpt-4o-mini':  { input: 0.15, output:  0.60 },
  'gpt-4o-mini-tts': { input: 0.60, output: 12.00 },
  'tts-1':        { input: 15.00, output: 0 },    // per 1M chars
  'nova-2':       { input: 0.0043, output: 0 },   // Deepgram: per minute
}

export async function logUsage(params: {
  userId?:           string | null
  callType:          string
  model:             string
  promptTokens?:     number
  completionTokens?: number
  totalTokens?:      number
  units?:            number   // for TTS (chars) or STT (seconds)
}) {
  const { userId, callType, model, promptTokens = 0, completionTokens = 0, totalTokens, units } = params

  await ensureApiUsageTable()

  const totalTok = totalTokens ?? (promptTokens + completionTokens)
  const pricing  = PRICING[model] ?? { input: 0, output: 0 }

  let costUsd = 0
  if (model === 'tts-1') {
    costUsd = ((units ?? promptTokens) / 1_000_000) * pricing.input
  } else if (model === 'nova-2') {
    costUsd = ((units ?? 0) / 60) * pricing.input  // seconds → minutes
  } else {
    costUsd = (promptTokens / 1_000_000) * pricing.input +
              (completionTokens / 1_000_000) * pricing.output
  }

  await execute(
    `INSERT INTO api_usage (id, user_id, call_type, model, prompt_tokens, completion_tokens, total_tokens, cost_usd)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
    [userId ?? null, callType, model, promptTokens, completionTokens, totalTok, costUsd.toFixed(6)]
  ).catch(err => console.warn('[usage] failed to log:', err.message))
}

export async function ensureApiUsageTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id           VARCHAR(36),
      call_type         VARCHAR(50) NOT NULL,
      model             VARCHAR(50) NOT NULL,
      prompt_tokens     INT NOT NULL DEFAULT 0,
      completion_tokens INT NOT NULL DEFAULT 0,
      total_tokens      INT NOT NULL DEFAULT 0,
      cost_usd          DECIMAL(12,6) NOT NULL DEFAULT 0,
      created_at        DATETIME NOT NULL DEFAULT NOW(),
      INDEX idx_api_usage_user (user_id),
      INDEX idx_api_usage_created (created_at),
      INDEX idx_api_usage_call_type (call_type)
    )
  `).catch(err => console.warn('[usage] failed to ensure table:', err.message))
}
