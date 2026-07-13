ALTER TABLE users
  ADD COLUMN password_reset_token_hash VARCHAR(64),
  ADD COLUMN password_reset_expires DATETIME;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_hash    CHAR(64) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_password_reset_ip_created (ip_hash, created_at),
  INDEX idx_password_reset_email_created (email_hash, created_at),
  INDEX idx_password_reset_created (created_at)
);
