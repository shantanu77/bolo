-- User-specific categories (AI-generated + user-created)
CREATE TABLE IF NOT EXISTS user_categories (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  icon        VARCHAR(10)  NOT NULL DEFAULT '💬',
  source      VARCHAR(20)  NOT NULL DEFAULT 'ai_generated',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User-specific scenarios (AI-generated or user-requested)
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
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id)     REFERENCES users(id)             ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES user_categories(id)   ON DELETE SET NULL
);

-- Mastery for user scenarios (mirrors scenario_mastery)
CREATE TABLE IF NOT EXISTS user_scenario_mastery (
  id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       VARCHAR(36) NOT NULL,
  scenario_id   VARCHAR(36) NOT NULL,
  best_score    INT NOT NULL DEFAULT 0,
  attempt_count INT NOT NULL DEFAULT 0,
  mastery_stars INT NOT NULL DEFAULT 0,
  last_played   DATETIME,
  UNIQUE KEY uq_user_uscenario (user_id, scenario_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES user_scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_categories_user ON user_categories(user_id);
CREATE INDEX idx_user_scenarios_user  ON user_scenarios(user_id);
CREATE INDEX idx_user_scenarios_cat   ON user_scenarios(category_id);
