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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES user_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_category_generation_jobs_user_status ON category_generation_jobs(user_id, status);
CREATE INDEX idx_category_generation_jobs_category ON category_generation_jobs(category_id);
