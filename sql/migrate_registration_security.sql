CREATE TABLE IF NOT EXISTS registration_attempts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_hash    CHAR(64) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_registration_attempts_ip_created (ip_hash, created_at),
  INDEX idx_registration_attempts_email_created (email_hash, created_at),
  INDEX idx_registration_attempts_created (created_at)
);
