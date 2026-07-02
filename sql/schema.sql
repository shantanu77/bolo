SET NAMES utf8mb4;
SET time_zone = '+05:30';

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
  subscription_ends DATETIME,
  xp            INT NOT NULL DEFAULT 0,
  level         INT NOT NULL DEFAULT 1,
  streak_days   INT NOT NULL DEFAULT 0,
  last_practiced DATE,
  streak_shield INT NOT NULL DEFAULT 0,
  avatar_color  VARCHAR(7)  NOT NULL DEFAULT '#6366f1',
  show_on_leaderboard TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE IF NOT EXISTS personas (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id           VARCHAR(36)  NOT NULL UNIQUE,
  native_language   VARCHAR(50)  NOT NULL DEFAULT 'Hindi',
  job_role          VARCHAR(255),
  seniority         VARCHAR(50),
  industry          VARCHAR(100),
  company_size      VARCHAR(50),
  interacts_with    JSON,
  challenges        JSON,
  goals             JSON,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenarios (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  category        VARCHAR(50)  NOT NULL,
  title           VARCHAR(255) NOT NULL,
  context         TEXT NOT NULL,
  question        TEXT NOT NULL,
  register        VARCHAR(20)  NOT NULL DEFAULT 'semi_formal',
  vocab_level     VARCHAR(20)  NOT NULL DEFAULT 'professional',
  comm_goal       VARCHAR(30)  NOT NULL DEFAULT 'clarity',
  common_mistakes JSON,
  ideal_wpm_min   INT NOT NULL DEFAULT 110,
  ideal_wpm_max   INT NOT NULL DEFAULT 140,
  is_daily        TINYINT(1)   NOT NULL DEFAULT 0,
  daily_date      DATE,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id         VARCHAR(36)  NOT NULL,
  scenario_id     VARCHAR(36)  NOT NULL,
  attempt_count   INT NOT NULL DEFAULT 0,
  best_score      INT,
  last_score      INT,
  started_at      DATETIME NOT NULL DEFAULT NOW(),
  ended_at        DATETIME,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempts (
  id                  VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  session_id          VARCHAR(36)  NOT NULL,
  user_id             VARCHAR(36)  NOT NULL,
  transcript          TEXT,
  audio_path          VARCHAR(512),
  duration_sec        FLOAT,
  words_per_minute    FLOAT,
  filler_word_count   INT NOT NULL DEFAULT 0,
  filler_words        JSON,
  score_clarity       INT,
  score_fluency       INT,
  score_vocabulary    INT,
  score_structure     INT,
  score_confidence    INT,
  score_tone          INT,
  score_overall       INT,
  feedback_text       TEXT,
  model_response      TEXT,
  tts_audio_path      VARCHAR(512),
  xp_earned           INT NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS badges (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon        VARCHAR(10)  NOT NULL,
  category    VARCHAR(30)  NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  badge_slug  VARCHAR(50)  NOT NULL,
  earned_at   DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_user_badge (user_id, badge_slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_mastery (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  scenario_id VARCHAR(36)  NOT NULL,
  best_score  INT NOT NULL DEFAULT 0,
  attempt_count INT NOT NULL DEFAULT 0,
  mastery_stars INT NOT NULL DEFAULT 0,
  last_played DATETIME,
  UNIQUE KEY uq_user_scenario (user_id, scenario_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_xp (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  month_year  VARCHAR(7)   NOT NULL,
  xp          INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_month (user_id, month_year),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_attempts_user   ON attempts(user_id);
CREATE INDEX idx_attempts_session ON attempts(session_id);
CREATE INDEX idx_sessions_user   ON sessions(user_id);
CREATE INDEX idx_mastery_user    ON scenario_mastery(user_id);
CREATE INDEX idx_monthly_xp_month ON monthly_xp(month_year);
