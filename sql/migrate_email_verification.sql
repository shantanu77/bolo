ALTER TABLE users
  ADD COLUMN email_verified_at DATETIME,
  ADD COLUMN email_verification_token_hash VARCHAR(64),
  ADD COLUMN email_verification_expires DATETIME;

UPDATE users
SET email_verified_at = COALESCE(created_at, NOW())
WHERE email_verified_at IS NULL
  AND account_status <> 'pending_verification'
  AND email_verification_token_hash IS NULL;
