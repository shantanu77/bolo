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
);

CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);
CREATE INDEX idx_api_usage_call_type ON api_usage(call_type);
