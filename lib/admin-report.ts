import { execute, query, queryOne } from './db'

type Scalar = string | number | Date | null

export interface AdminSummaryRow {
  [key: string]: string | number | null
}

export interface AdminSummaryResponse {
  generatedAt: string
  timezone: string
  summary: {
    growth: AdminSummaryRow
    funnel: AdminSummaryRow
    engagement: AdminSummaryRow
    revenue: AdminSummaryRow
    subscriptions: AdminSummaryRow
    content: AdminSummaryRow
    aiUsage: AdminSummaryRow
  }
  topUsage: AdminSummaryRow[]
  topUsers: AdminSummaryRow[]
}

function formatSqlDate(date: Date) {
  return `${date.toISOString().slice(0, 10)} 00:00:00`
}

function dateDaysAgo(days: number) {
  const next = new Date()
  next.setUTCDate(next.getUTCDate() - days)
  return next
}

async function ensureAdminReportingTables() {
  await execute(`
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

  await execute(`
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
      updated_at       DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
    )
  `)

  await execute(`
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
      created_at        DATETIME NOT NULL DEFAULT NOW()
    )
  `)
}

async function row<T extends AdminSummaryRow>(sql: string, params: Scalar[] = []) {
  return await queryOne<T>(sql, params)
}

async function rows<T extends AdminSummaryRow>(sql: string, params: Scalar[] = []) {
  return await query<T>(sql, params)
}

export async function getAdminSummary(): Promise<AdminSummaryResponse> {
  await ensureAdminReportingTables()

  const now = new Date()
  const todayStart = formatSqlDate(now)
  const yesterdayStart = formatSqlDate(dateDaysAgo(1))
  const last7Start = formatSqlDate(dateDaysAgo(7))
  const last30Start = formatSqlDate(dateDaysAgo(30))
  const monthStart = formatSqlDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))

  const growth = await row(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_today,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_7d,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_30d,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_users_mtd,
      SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_users,
      SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) AS active_accounts,
      SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) AS suspended_accounts
    FROM users
  `, [todayStart, last7Start, last30Start, monthStart]) ?? {}

  const funnel = await row(`
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
  `) ?? {}

  const engagement = await row(`
    SELECT
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS dau,
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS wau,
      COUNT(DISTINCT CASE WHEN s.started_at >= ? THEN s.user_id END) AS mau,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_today,
      COUNT(CASE WHEN s.started_at >= ? AND s.started_at < ? THEN 1 END) AS sessions_yesterday,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_7d,
      COUNT(CASE WHEN s.started_at >= ? THEN 1 END) AS sessions_30d,
      COUNT(CASE WHEN a.created_at >= ? THEN 1 END) AS attempts_today,
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
    last30Start,
    last30Start,
    last30Start,
    last30Start,
    last30Start,
  ]) ?? {}

  const revenue = await row(`
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
  `, [todayStart, last30Start, monthStart, last30Start, monthStart]) ?? {}

  const subscriptions = await row(`
    SELECT
      SUM(CASE WHEN subscription_tier = 'pro' AND (subscription_ends IS NULL OR subscription_ends >= NOW()) THEN 1 ELSE 0 END) AS active_pro,
      SUM(CASE WHEN subscription_tier = 'pro_trial' AND (subscription_ends IS NULL OR subscription_ends >= NOW()) THEN 1 ELSE 0 END) AS active_trials,
      SUM(CASE WHEN subscription_tier IN ('pro', 'pro_trial') AND subscription_ends BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring_7d,
      SUM(CASE WHEN subscription_tier IN ('pro', 'pro_trial') AND subscription_ends < NOW() THEN 1 ELSE 0 END) AS expired_paid_access
    FROM users
  `) ?? {}

  const content = await row(`
    SELECT
      (SELECT COUNT(*) FROM scenarios WHERE is_active = 1) AS active_default_scenarios,
      (SELECT COUNT(*) FROM user_categories) AS custom_categories_total,
      (SELECT COUNT(*) FROM user_categories WHERE created_at >= ?) AS custom_categories_30d,
      (SELECT COUNT(*) FROM user_scenarios) AS custom_scenarios_total,
      (SELECT COUNT(*) FROM user_scenarios WHERE created_at >= ?) AS custom_scenarios_30d,
      (SELECT COUNT(*) FROM category_generation_jobs WHERE created_at >= ?) AS generation_jobs_30d,
      (SELECT COUNT(*) FROM learning_guides) AS learning_guides_total,
      (SELECT COUNT(*) FROM learning_guides WHERE created_at >= ?) AS learning_guides_30d
  `, [last30Start, last30Start, last30Start, last30Start]) ?? {}

  const aiUsage = await row(`
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
  `, [todayStart, last7Start, last30Start, monthStart, todayStart, last7Start, last30Start, monthStart, last30Start]) ?? {}

  const topUsage = await rows(`
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

  const topUsers = await rows(`
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

  return {
    generatedAt: now.toISOString(),
    timezone: 'Asia/Kolkata',
    summary: {
      growth,
      funnel,
      engagement,
      revenue,
      subscriptions,
      content,
      aiUsage,
    },
    topUsage,
    topUsers,
  }
}
