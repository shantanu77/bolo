import path from 'path'
import { config as dotenvConfig } from 'dotenv'
import nodemailer from 'nodemailer'
const PROJECT_ROOT = process.cwd()

dotenvConfig({ path: path.join(PROJECT_ROOT, '.env.local') })
dotenvConfig({ path: path.join(PROJECT_ROOT, '.env') })

import mysql from 'mysql2/promise'

const RECIPIENT = process.env.ADMIN_REPORT_EMAIL
  ?? process.env.REPORT_EMAIL
  ?? 'shantanu@mobileyug.com'
const APP_NAME = process.env.ADMIN_REPORT_APP_NAME ?? 'AuraXpress'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://auraxpress.com'
const INR_RATE = Number(process.env.ADMIN_REPORT_USD_INR ?? 83.5)
const TIMEZONE = process.env.ADMIN_REPORT_TIMEZONE ?? 'Asia/Kolkata'

type Row = mysql.RowDataPacket

function formatInt(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('en-IN')
}

function formatNumber(value: number | string | null | undefined, digits = 1) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num.toFixed(digits) : '0.0'
}

function formatUsd(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function formatInr(value: number | string | null | undefined) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function formatPct(value: number | string | null | undefined, digits = 1) {
  return `${Number(value ?? 0).toFixed(digits)}%`
}

function startOfDay(date: Date) {
  return `${date.toISOString().slice(0, 10)} 00:00:00`
}

function dateDaysAgo(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildTextSection(title: string, lines: string[]) {
  return `${title}\n${'-'.repeat(title.length)}\n${lines.join('\n')}`
}

function buildHtmlTable(title: string, rows: Array<[string, string]>) {
  return `
    <div style="margin-top:24px">
      <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px">${escapeHtml(title)}</div>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        ${rows.map(([label, value], index) => `
          <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f9fafb'}">
            <td style="padding:10px 12px;color:#4b5563;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td>
            <td style="padding:10px 12px;color:#111827;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `
}

function createMailTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

function sender(label: string) {
  return `"${label}" <${process.env.EMAIL_FROM}>`
}

async function getSingleRow<T extends Row>(db: mysql.Connection, sql: string, params: Array<string | number | Date | null> = []) {
  const [rows] = await db.execute<T[]>(sql, params)
  return rows[0]
}

async function getRows<T extends Row>(db: mysql.Connection, sql: string, params: Array<string | number | Date | null> = []) {
  const [rows] = await db.execute<T[]>(sql, params)
  return rows
}

async function ensureReportingTables(db: mysql.Connection) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
      user_id     VARCHAR(36)  NOT NULL,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      icon        VARCHAR(10)  NOT NULL DEFAULT '💬',
      source      VARCHAR(20)  NOT NULL DEFAULT 'ai_generated',
      sort_order  INT NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_scenarios (
      id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
      user_id         VARCHAR(36)  NOT NULL,
      category_id     VARCHAR(36),
      title           VARCHAR(255) NOT NULL,
      context         TEXT NOT NULL,
      question        TEXT NOT NULL,
      register        VARCHAR(20)  NOT NULL DEFAULT 'semi_formal',
      vocab_level     VARCHAR(20)  NOT NULL DEFAULT 'professional',
      comm_goal       VARCHAR(30)  NOT NULL DEFAULT 'clarity',
      common_mistakes JSON,
      ideal_wpm_min   INT NOT NULL DEFAULT 110,
      ideal_wpm_max   INT NOT NULL DEFAULT 140,
      source          VARCHAR(20)  NOT NULL DEFAULT 'ai_generated',
      is_active       TINYINT(1)   NOT NULL DEFAULT 1,
      sort_order      INT NOT NULL DEFAULT 0,
      created_at      DATETIME NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(`
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
      updated_at       DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id                  VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id             VARCHAR(36) NOT NULL,
      plan                VARCHAR(30) NOT NULL DEFAULT 'pro_monthly',
      amount              INT NOT NULL,
      currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
      receipt             VARCHAR(40) NOT NULL,
      razorpay_order_id   VARCHAR(80) NOT NULL UNIQUE,
      razorpay_payment_id VARCHAR(80),
      razorpay_signature  TEXT,
      status              VARCHAR(20) NOT NULL DEFAULT 'created',
      error_message       TEXT,
      created_at          DATETIME NOT NULL DEFAULT NOW(),
      paid_at             DATETIME,
      updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `)
}

async function run() {
  const mode = process.argv.includes('--sample') ? 'sample' : 'daily'
  const db = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER || 'bolo_user',
    password: process.env.DATABASE_PASSWORD || 'bolo_pass',
    database: process.env.DATABASE_NAME || 'bolo_english',
    timezone: '+05:30',
  })
  await ensureReportingTables(db)

  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = startOfDay(dateDaysAgo(1))
  const last7Start = startOfDay(dateDaysAgo(7))
  const last30Start = startOfDay(dateDaysAgo(30))
  const monthStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthStart = startOfDay(monthStartDate)
  const reportDate = now.toLocaleString('en-IN', { timeZone: TIMEZONE, dateStyle: 'medium', timeStyle: 'short' })
  const monthLabel = now.toLocaleString('en-IN', { timeZone: TIMEZONE, month: 'long', year: 'numeric' })

  const growth = await getSingleRow<Row>(db, `
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_today,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_7d,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_30d,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_mtd,
      SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_users,
      SUM(CASE WHEN subscription_tier = 'pro' THEN 1 ELSE 0 END) AS pro_users,
      SUM(CASE WHEN subscription_tier = 'pro_trial' THEN 1 ELSE 0 END) AS trial_users,
      SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) AS active_accounts,
      SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) AS suspended_accounts
    FROM users
  `, [todayStart, last7Start, last30Start, monthStart])

  const funnel = await getSingleRow<Row>(db, `
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN p.user_id IS NOT NULL THEN 1 ELSE 0 END) AS persona_users,
      SUM(CASE WHEN sess.user_id IS NOT NULL THEN 1 ELSE 0 END) AS session_users,
      SUM(CASE WHEN att.user_id IS NOT NULL THEN 1 ELSE 0 END) AS attempt_users,
      SUM(CASE WHEN lg.user_id IS NOT NULL THEN 1 ELSE 0 END) AS guide_users
    FROM users u
    LEFT JOIN personas p ON p.user_id = u.id
    LEFT JOIN (SELECT DISTINCT user_id FROM sessions) sess ON sess.user_id = u.id
    LEFT JOIN (SELECT DISTINCT user_id FROM attempts) att ON att.user_id = u.id
    LEFT JOIN (SELECT DISTINCT user_id FROM learning_guides) lg ON lg.user_id = u.id
  `)

  const engagement = await getSingleRow<Row>(db, `
    SELECT
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS dau,
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS wau,
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS mau,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_today,
      COUNT(CASE WHEN s.started_at >= ? AND s.started_at < ? THEN 1 END) AS sessions_yesterday,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_7d,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_30d,
      COUNT(CASE WHEN a.created_at >= ? THEN 1 END) AS attempts_today,
      COUNT(CASE WHEN a.created_at >= ? THEN 1 END) AS attempts_7d,
      COUNT(CASE WHEN a.created_at >= ? THEN 1 END) AS attempts_30d,
      ROUND(AVG(CASE WHEN a.created_at >= ? THEN a.score_overall END), 1) AS avg_score_30d,
      ROUND(AVG(CASE WHEN a.created_at >= ? THEN a.duration_sec END), 1) AS avg_duration_30d,
      ROUND(AVG(CASE WHEN a.created_at >= ? THEN a.words_per_minute END), 1) AS avg_wpm_30d,
      ROUND(AVG(CASE WHEN a.created_at >= ? THEN a.filler_word_count END), 1) AS avg_fillers_30d
    FROM sessions s
    LEFT JOIN attempts a ON a.session_id = s.id
  `, [
    todayStart,
    last7Start,
    last30Start,
    todayStart,
    yesterdayStart,
    todayStart,
    last7Start,
    last30Start,
    todayStart,
    last7Start,
    last30Start,
    last30Start,
    last30Start,
    last30Start,
    last30Start,
  ])

  const content = await getSingleRow<Row>(db, `
    SELECT
      (SELECT COUNT(*) FROM scenarios WHERE is_active = 1) AS active_default_scenarios,
      (SELECT COUNT(*) FROM user_categories) AS custom_categories_total,
      (SELECT COUNT(*) FROM user_categories WHERE created_at >= ?) AS custom_categories_30d,
      (SELECT COUNT(*) FROM user_scenarios) AS custom_scenarios_total,
      (SELECT COUNT(*) FROM user_scenarios WHERE created_at >= ?) AS custom_scenarios_30d,
      (SELECT COUNT(*) FROM category_generation_jobs WHERE created_at >= ?) AS generation_jobs_30d,
      (SELECT COUNT(*) FROM learning_guides) AS learning_guides_total,
      (SELECT COUNT(*) FROM learning_guides WHERE created_at >= ?) AS learning_guides_30d
  `, [last30Start, last30Start, last30Start, last30Start])

  const revenue = await getSingleRow<Row>(db, `
    SELECT
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) / 100 AS revenue_all_time_inr,
      SUM(CASE WHEN status = 'paid' AND paid_at >= ? THEN amount ELSE 0 END) / 100 AS revenue_today_inr,
      SUM(CASE WHEN status = 'paid' AND paid_at >= ? THEN amount ELSE 0 END) / 100 AS revenue_30d_inr,
      SUM(CASE WHEN status = 'paid' AND paid_at >= ? THEN amount ELSE 0 END) / 100 AS revenue_mtd_inr,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_orders_all_time,
      COUNT(CASE WHEN status = 'paid' AND paid_at >= ? THEN 1 END) AS paid_orders_30d,
      COUNT(CASE WHEN status = 'paid' AND paid_at >= ? THEN 1 END) AS paid_orders_mtd,
      COUNT(CASE WHEN status = 'created' THEN 1 END) AS open_orders
    FROM payment_orders
  `, [todayStart, last30Start, monthStart, last30Start, monthStart])

  const subscriptions = await getSingleRow<Row>(db, `
    SELECT
      SUM(CASE WHEN subscription_tier = 'pro' AND (subscription_ends IS NULL OR subscription_ends >= NOW()) THEN 1 ELSE 0 END) AS active_pro,
      SUM(CASE WHEN subscription_tier = 'pro_trial' AND (subscription_ends IS NULL OR subscription_ends >= NOW()) THEN 1 ELSE 0 END) AS active_trials,
      SUM(CASE WHEN subscription_tier IN ('pro', 'pro_trial') AND subscription_ends BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring_7d,
      SUM(CASE WHEN subscription_tier IN ('pro', 'pro_trial') AND subscription_ends < NOW() THEN 1 ELSE 0 END) AS expired_paid_access
    FROM users
  `)

  const aiUsage = await getSingleRow<Row>(db, `
    SELECT
      SUM(CASE WHEN created_at >= ? THEN total_tokens ELSE 0 END) AS tokens_today,
      SUM(CASE WHEN created_at >= ? THEN total_tokens ELSE 0 END) AS tokens_7d,
      SUM(CASE WHEN created_at >= ? THEN total_tokens ELSE 0 END) AS tokens_30d,
      SUM(CASE WHEN created_at >= ? THEN total_tokens ELSE 0 END) AS tokens_mtd,
      SUM(CASE WHEN created_at >= ? THEN cost_usd ELSE 0 END) AS cost_today_usd,
      SUM(CASE WHEN created_at >= ? THEN cost_usd ELSE 0 END) AS cost_7d_usd,
      SUM(CASE WHEN created_at >= ? THEN cost_usd ELSE 0 END) AS cost_30d_usd,
      SUM(CASE WHEN created_at >= ? THEN cost_usd ELSE 0 END) AS cost_mtd_usd,
      COUNT(CASE WHEN created_at >= ? THEN 1 END) AS calls_30d
    FROM api_usage
  `, [todayStart, last7Start, last30Start, monthStart, todayStart, last7Start, last30Start, monthStart, last30Start])

  const aiByType = await getRows<Row>(db, `
    SELECT
      call_type,
      model,
      COUNT(*) AS call_count,
      SUM(total_tokens) AS total_tokens,
      SUM(cost_usd) AS cost_usd
    FROM api_usage
    WHERE created_at >= ?
    GROUP BY call_type, model
    ORDER BY cost_usd DESC, total_tokens DESC
    LIMIT 8
  `, [last30Start])

  const topUsers = await getRows<Row>(db, `
    SELECT
      u.name,
      u.email,
      COUNT(a.id) AS attempts_30d,
      ROUND(AVG(a.score_overall), 1) AS avg_score_30d,
      MAX(a.created_at) AS last_attempt_at,
      u.xp,
      u.streak_days
    FROM users u
    JOIN attempts a ON a.user_id = u.id
    WHERE a.created_at >= ?
    GROUP BY u.id, u.name, u.email, u.xp, u.streak_days
    ORDER BY attempts_30d DESC, avg_score_30d DESC
    LIMIT 5
  `, [last30Start])

  await db.end()

  const verifiedRate = Number(growth.verified_users ?? 0) / Math.max(Number(growth.total_users ?? 0), 1) * 100
  const personaRate = Number(funnel.persona_users ?? 0) / Math.max(Number(funnel.total_users ?? 0), 1) * 100
  const activationRate = Number(funnel.session_users ?? 0) / Math.max(Number(funnel.total_users ?? 0), 1) * 100
  const attemptRate = Number(funnel.attempt_users ?? 0) / Math.max(Number(funnel.total_users ?? 0), 1) * 100
  const paidShare = Number(subscriptions.active_pro ?? 0) / Math.max(Number(growth.total_users ?? 0), 1) * 100
  const costMtdInr = Number(aiUsage.cost_mtd_usd ?? 0) * INR_RATE

  const summaryLines = [
    `Report mode: ${mode}`,
    `Generated at: ${reportDate} (${TIMEZONE})`,
    `Admin recipient: ${RECIPIENT}`,
  ]

  const growthLines = [
    `Total users: ${formatInt(growth.total_users)}`,
    `New users today: ${formatInt(growth.new_users_today)}`,
    `New users last 7 days: ${formatInt(growth.new_users_7d)}`,
    `New users last 30 days: ${formatInt(growth.new_users_30d)}`,
    `New users this month: ${formatInt(growth.new_users_mtd)}`,
    `Verified users: ${formatInt(growth.verified_users)} (${formatPct(verifiedRate)})`,
    `Paid Pro users: ${formatInt(subscriptions.active_pro)} (${formatPct(paidShare)})`,
    `Active trials: ${formatInt(subscriptions.active_trials)}`,
    `Accounts suspended: ${formatInt(growth.suspended_accounts)}`,
  ]

  const funnelLines = [
    `Users with persona: ${formatInt(funnel.persona_users)} (${formatPct(personaRate)})`,
    `Users who started a session: ${formatInt(funnel.session_users)} (${formatPct(activationRate)})`,
    `Users with at least one attempt: ${formatInt(funnel.attempt_users)} (${formatPct(attemptRate)})`,
    `Users with learning guides: ${formatInt(funnel.guide_users)}`,
  ]

  const engagementLines = [
    `DAU / WAU / MAU: ${formatInt(engagement.dau)} / ${formatInt(engagement.wau)} / ${formatInt(engagement.mau)}`,
    `Sessions today: ${formatInt(engagement.sessions_today)}`,
    `Sessions yesterday: ${formatInt(engagement.sessions_yesterday)}`,
    `Sessions last 7 days: ${formatInt(engagement.sessions_7d)}`,
    `Sessions last 30 days: ${formatInt(engagement.sessions_30d)}`,
    `Attempts today: ${formatInt(engagement.attempts_today)}`,
    `Attempts last 7 days: ${formatInt(engagement.attempts_7d)}`,
    `Attempts last 30 days: ${formatInt(engagement.attempts_30d)}`,
    `Avg score last 30 days: ${formatNumber(engagement.avg_score_30d)}/100`,
    `Avg attempt duration last 30 days: ${formatNumber(engagement.avg_duration_30d)} sec`,
    `Avg WPM last 30 days: ${formatNumber(engagement.avg_wpm_30d)}`,
    `Avg filler words last 30 days: ${formatNumber(engagement.avg_fillers_30d)}`,
  ]

  const revenueLines = [
    `Revenue today: ${formatInr(revenue.revenue_today_inr)}`,
    `Revenue last 30 days: ${formatInr(revenue.revenue_30d_inr)}`,
    `Revenue this month: ${formatInr(revenue.revenue_mtd_inr)}`,
    `Revenue all time: ${formatInr(revenue.revenue_all_time_inr)}`,
    `Paid orders this month: ${formatInt(revenue.paid_orders_mtd)}`,
    `Paid orders last 30 days: ${formatInt(revenue.paid_orders_30d)}`,
    `Open unpaid orders: ${formatInt(revenue.open_orders)}`,
    `Expiring paid access in 7 days: ${formatInt(subscriptions.expiring_7d)}`,
    `Expired paid/trial access: ${formatInt(subscriptions.expired_paid_access)}`,
  ]

  const contentLines = [
    `Default active scenarios: ${formatInt(content.active_default_scenarios)}`,
    `Custom categories total: ${formatInt(content.custom_categories_total)}`,
    `Custom categories last 30 days: ${formatInt(content.custom_categories_30d)}`,
    `Custom scenarios total: ${formatInt(content.custom_scenarios_total)}`,
    `Custom scenarios last 30 days: ${formatInt(content.custom_scenarios_30d)}`,
    `Category generation jobs last 30 days: ${formatInt(content.generation_jobs_30d)}`,
    `Learning guides total: ${formatInt(content.learning_guides_total)}`,
    `Learning guides last 30 days: ${formatInt(content.learning_guides_30d)}`,
  ]

  const aiLines = [
    `AI calls last 30 days: ${formatInt(aiUsage.calls_30d)}`,
    `Tokens today: ${formatInt(aiUsage.tokens_today)}`,
    `Tokens last 7 days: ${formatInt(aiUsage.tokens_7d)}`,
    `Tokens last 30 days: ${formatInt(aiUsage.tokens_30d)}`,
    `Tokens this month: ${formatInt(aiUsage.tokens_mtd)}`,
    `AI cost today: ${formatUsd(aiUsage.cost_today_usd)}`,
    `AI cost last 7 days: ${formatUsd(aiUsage.cost_7d_usd)}`,
    `AI cost last 30 days: ${formatUsd(aiUsage.cost_30d_usd)}`,
    `AI cost this month: ${formatUsd(aiUsage.cost_mtd_usd)} (~${formatInr(costMtdInr)})`,
  ]

  const topUsageLines = aiByType.length
    ? aiByType.map((row) =>
        `${row.call_type} / ${row.model}: ${formatInt(row.call_count)} calls, ${formatInt(row.total_tokens)} tokens, ${formatUsd(row.cost_usd)}`
      )
    : ['No API usage logged in the last 30 days.']

  const topUserLines = topUsers.length
    ? topUsers.map((row, index) =>
        `${index + 1}. ${row.name} <${row.email}> | ${formatInt(row.attempts_30d)} attempts | avg ${formatNumber(row.avg_score_30d)}/100 | XP ${formatInt(row.xp)} | streak ${formatInt(row.streak_days)}`
      )
    : ['No practice attempts in the last 30 days.']

  const text = [
    `${APP_NAME} Admin Daily Usage Summary`,
    `Month: ${monthLabel}`,
    '',
    buildTextSection('Report Meta', summaryLines),
    '',
    buildTextSection('Growth Snapshot', growthLines),
    '',
    buildTextSection('Activation Funnel', funnelLines),
    '',
    buildTextSection('Engagement', engagementLines),
    '',
    buildTextSection('Revenue and Subscriptions', revenueLines),
    '',
    buildTextSection('Content and Product Usage', contentLines),
    '',
    buildTextSection('AI Usage and Cost', aiLines),
    '',
    buildTextSection('Top AI Cost Buckets (30d)', topUsageLines),
    '',
    buildTextSection('Top Active Users (30d)', topUserLines),
    '',
    `App URL: ${APP_URL}`,
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;color:#111827">
      <div style="max-width:900px;margin:0 auto;background:#f3f4f6">
        <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;padding:24px;border-radius:16px">
          <div style="font-size:24px;font-weight:800">${escapeHtml(APP_NAME)} Admin Daily Usage Summary</div>
          <div style="margin-top:8px;opacity:0.9">${escapeHtml(reportDate)} (${escapeHtml(TIMEZONE)})</div>
          <div style="margin-top:4px;opacity:0.9">Mode: ${escapeHtml(mode)} | Recipient: ${escapeHtml(RECIPIENT)}</div>
        </div>
        ${buildHtmlTable('Growth Snapshot', [
          ['Total users', formatInt(growth.total_users)],
          ['New users today', formatInt(growth.new_users_today)],
          ['New users last 7 days', formatInt(growth.new_users_7d)],
          ['New users last 30 days', formatInt(growth.new_users_30d)],
          ['New users this month', formatInt(growth.new_users_mtd)],
          ['Verified users', `${formatInt(growth.verified_users)} (${formatPct(verifiedRate)})`],
          ['Paid Pro users', `${formatInt(subscriptions.active_pro)} (${formatPct(paidShare)})`],
          ['Active trials', formatInt(subscriptions.active_trials)],
        ])}
        ${buildHtmlTable('Activation Funnel', [
          ['Users with persona', `${formatInt(funnel.persona_users)} (${formatPct(personaRate)})`],
          ['Users who started a session', `${formatInt(funnel.session_users)} (${formatPct(activationRate)})`],
          ['Users with at least one attempt', `${formatInt(funnel.attempt_users)} (${formatPct(attemptRate)})`],
          ['Users with learning guides', formatInt(funnel.guide_users)],
        ])}
        ${buildHtmlTable('Engagement', [
          ['DAU / WAU / MAU', `${formatInt(engagement.dau)} / ${formatInt(engagement.wau)} / ${formatInt(engagement.mau)}`],
          ['Sessions today', formatInt(engagement.sessions_today)],
          ['Sessions yesterday', formatInt(engagement.sessions_yesterday)],
          ['Sessions last 7 days', formatInt(engagement.sessions_7d)],
          ['Sessions last 30 days', formatInt(engagement.sessions_30d)],
          ['Attempts today', formatInt(engagement.attempts_today)],
          ['Attempts last 30 days', formatInt(engagement.attempts_30d)],
          ['Avg score last 30 days', `${formatNumber(engagement.avg_score_30d)}/100`],
          ['Avg duration last 30 days', `${formatNumber(engagement.avg_duration_30d)} sec`],
          ['Avg WPM last 30 days', formatNumber(engagement.avg_wpm_30d)],
        ])}
        ${buildHtmlTable('Revenue and Subscriptions', [
          ['Revenue today', formatInr(revenue.revenue_today_inr)],
          ['Revenue last 30 days', formatInr(revenue.revenue_30d_inr)],
          ['Revenue this month', formatInr(revenue.revenue_mtd_inr)],
          ['Revenue all time', formatInr(revenue.revenue_all_time_inr)],
          ['Paid orders this month', formatInt(revenue.paid_orders_mtd)],
          ['Expiring paid access in 7 days', formatInt(subscriptions.expiring_7d)],
          ['Expired paid/trial access', formatInt(subscriptions.expired_paid_access)],
          ['Open unpaid orders', formatInt(revenue.open_orders)],
        ])}
        ${buildHtmlTable('Content and Product Usage', [
          ['Default active scenarios', formatInt(content.active_default_scenarios)],
          ['Custom categories total', formatInt(content.custom_categories_total)],
          ['Custom categories last 30 days', formatInt(content.custom_categories_30d)],
          ['Custom scenarios total', formatInt(content.custom_scenarios_total)],
          ['Custom scenarios last 30 days', formatInt(content.custom_scenarios_30d)],
          ['Learning guides total', formatInt(content.learning_guides_total)],
          ['Learning guides last 30 days', formatInt(content.learning_guides_30d)],
        ])}
        ${buildHtmlTable('AI Usage and Cost', [
          ['AI calls last 30 days', formatInt(aiUsage.calls_30d)],
          ['Tokens today', formatInt(aiUsage.tokens_today)],
          ['Tokens last 7 days', formatInt(aiUsage.tokens_7d)],
          ['Tokens last 30 days', formatInt(aiUsage.tokens_30d)],
          ['Tokens this month', formatInt(aiUsage.tokens_mtd)],
          ['AI cost today', formatUsd(aiUsage.cost_today_usd)],
          ['AI cost last 30 days', formatUsd(aiUsage.cost_30d_usd)],
          ['AI cost this month', `${formatUsd(aiUsage.cost_mtd_usd)} (~${formatInr(costMtdInr)})`],
        ])}
        <div style="margin-top:24px">
          <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px">Top AI Cost Buckets (30d)</div>
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;line-height:1.7">
            ${topUsageLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          </div>
        </div>
        <div style="margin-top:24px">
          <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px">Top Active Users (30d)</div>
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;line-height:1.7">
            ${topUserLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
          </div>
        </div>
        <div style="margin-top:24px;color:#4b5563;font-size:13px">
          App URL: <a href="${escapeHtml(APP_URL)}" style="color:#2563eb">${escapeHtml(APP_URL)}</a>
        </div>
      </div>
    </div>
  `

  const subjectPrefix = mode === 'sample' ? '[TEST] ' : ''
  const subject = `${subjectPrefix}${APP_NAME} Daily Admin Usage Summary - ${now.toISOString().slice(0, 10)}`
  const transporter = createMailTransport()

  await transporter.sendMail({
    from: sender(`${APP_NAME} Reports`),
    to: RECIPIENT,
    subject,
    text,
    html,
  })

  console.log(`Sent ${mode} report to ${RECIPIENT}`)
  console.log(`Users: ${formatInt(growth.total_users)} | Revenue MTD: ${formatInr(revenue.revenue_mtd_inr)} | AI cost MTD: ${formatUsd(aiUsage.cost_mtd_usd)}`)
}

run().catch((error) => {
  console.error('Failed to send usage report:', error)
  process.exit(1)
})
