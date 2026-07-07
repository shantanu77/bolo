/**
 * AuraXpress Usage Report
 *
 * Sends a usage + cost summary email for the current month.
 * Run manually:   npx ts-node -r tsconfig-paths/register scripts/send-usage-report.ts
 * Or via cron:    Add to package.json scripts and schedule with node-cron or system cron.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'

// Resolve .env.local relative to project root regardless of cwd
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
dotenvConfig({ path: path.join(PROJECT_ROOT, '.env.local') })
dotenvConfig({ path: path.join(PROJECT_ROOT, '.env') })

import mysql from 'mysql2/promise'
import nodemailer from 'nodemailer'

const RECIPIENT = process.env.REPORT_EMAIL ?? 'helloaura@auraxpress.com'
const INR_RATE  = 83.5   // USD → INR (update periodically)

async function run() {
  const db = await mysql.createConnection({
    host:     process.env.DATABASE_HOST     || 'localhost',
    port:     Number(process.env.DATABASE_PORT) || 3306,
    user:     process.env.DATABASE_USER     || 'bolo_user',
    password: process.env.DATABASE_PASSWORD || 'bolo_pass',
    database: process.env.DATABASE_NAME     || 'bolo_english',
  })

  const now       = new Date()
  const monthYear = now.toISOString().slice(0, 7)          // "2026-07"
  const monthStart = `${monthYear}-01 00:00:00`
  const today      = now.toISOString().slice(0, 10)

  // ── App stats ──────────────────────────────────────────────────────────────
  const [[stats]]      = await db.execute<mysql.RowDataPacket[]>(`
    SELECT
      COUNT(DISTINCT u.id)   AS total_users,
      COUNT(DISTINCT CASE WHEN u.created_at >= ? THEN u.id END) AS new_users_month,
      COUNT(a.id)            AS total_attempts,
      COUNT(CASE WHEN a.created_at >= ? THEN 1 END) AS attempts_month,
      ROUND(AVG(a.score_overall), 1) AS avg_score
    FROM users u
    LEFT JOIN attempts a ON a.user_id = u.id
  `, [monthStart, monthStart])

  // ── Token usage this month ─────────────────────────────────────────────────
  const [usageRows] = await db.execute<mysql.RowDataPacket[]>(`
    SELECT
      call_type,
      model,
      SUM(prompt_tokens)      AS prompt_tokens,
      SUM(completion_tokens)  AS completion_tokens,
      SUM(total_tokens)       AS total_tokens,
      SUM(cost_usd)           AS cost_usd,
      COUNT(*)                AS call_count
    FROM api_usage
    WHERE created_at >= ?
    GROUP BY call_type, model
    ORDER BY cost_usd DESC
  `, [monthStart])

  // ── Daily breakdown (last 7 days) ─────────────────────────────────────────
  const [dailyRows] = await db.execute<mysql.RowDataPacket[]>(`
    SELECT
      DATE(created_at)       AS day,
      SUM(total_tokens)      AS tokens,
      SUM(cost_usd)          AS cost_usd,
      COUNT(*)               AS calls
    FROM api_usage
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY day DESC
  `, [])

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalTokens = (usageRows as mysql.RowDataPacket[]).reduce((s, r) => s + Number(r.total_tokens ?? 0), 0)
  const totalCostUsd = (usageRows as mysql.RowDataPacket[]).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  const totalCostInr = totalCostUsd * INR_RATE

  await db.end()

  // ── Build email ────────────────────────────────────────────────────────────
  const usageTable = (usageRows as mysql.RowDataPacket[]).length
    ? (usageRows as mysql.RowDataPacket[]).map(r =>
        `  ${String(r.call_type).padEnd(20)} ${String(r.model).padEnd(12)} ${String(r.call_count).padStart(5)} calls   ${Number(r.total_tokens ?? 0).toLocaleString().padStart(10)} tokens   $${Number(r.cost_usd ?? 0).toFixed(4).padStart(8)} USD`
      ).join('\n')
    : '  No API calls logged yet this month.'

  const dailyTable = (dailyRows as mysql.RowDataPacket[]).length
    ? (dailyRows as mysql.RowDataPacket[]).map(r =>
        `  ${r.day}   ${Number(r.calls).toString().padStart(4)} calls   ${Number(r.tokens ?? 0).toLocaleString().padStart(10)} tokens   $${Number(r.cost_usd ?? 0).toFixed(4)} USD`
      ).join('\n')
    : '  No data.'

  const subject = `AuraXpress Usage Report — ${monthYear} (as of ${today})`

  const text = `
═══════════════════════════════════════════════
  AURAXPRESS — MONTHLY USAGE REPORT
  Month: ${monthYear}   Generated: ${now.toISOString()}
═══════════════════════════════════════════════

APP STATS
─────────────────────────────────────────────
  Total registered users       ${stats.total_users}
  New users this month         ${stats.new_users_month}
  Total practice sessions      ${stats.total_attempts}
  Sessions this month          ${stats.attempts_month}
  Average overall score        ${stats.avg_score ?? 'N/A'} / 100

API USAGE THIS MONTH (${monthYear})
─────────────────────────────────────────────
  Call Type            Model          Calls        Tokens      Cost (USD)
${usageTable}

  ─────────────────────────────────────────
  TOTAL THIS MONTH     ${totalTokens.toLocaleString()} tokens     $${totalCostUsd.toFixed(4)} USD (~₹${totalCostInr.toFixed(0)})

DAILY BREAKDOWN (LAST 7 DAYS)
─────────────────────────────────────────────
${dailyTable}

PRICING REFERENCE
─────────────────────────────────────────────
  GPT-4o input          $2.50 / 1M tokens
  GPT-4o output         $10.00 / 1M tokens
  OpenAI TTS (tts-1)    $15.00 / 1M characters
  Deepgram nova-2       $0.0043 / minute
  Exchange rate used    1 USD = ₹${INR_RATE}

─────────────────────────────────────────────
  To view live token usage visit:
  https://platform.openai.com/usage
  https://console.deepgram.com/
═══════════════════════════════════════════════
`

  // ── Send email ─────────────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST     || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  })

  await transporter.sendMail({
    from:    `"AuraXpress Reports" <${process.env.EMAIL_FROM}>`,
    to:      RECIPIENT,
    subject,
    text,
    html: `<pre style="font-family:monospace;font-size:13px;background:#f8f7ff;padding:24px;border-radius:8px;line-height:1.6">${text}</pre>`,
  })

  console.log(`✓ Usage report sent to ${RECIPIENT}`)
  console.log(`  Month: ${monthYear}`)
  console.log(`  Total tokens: ${totalTokens.toLocaleString()}`)
  console.log(`  Total cost:   $${totalCostUsd.toFixed(4)} USD (~₹${totalCostInr.toFixed(0)})`)
}

run().catch(err => { console.error('Failed:', err.message); process.exit(1) })
