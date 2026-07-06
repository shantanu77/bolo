ALTER TABLE users
  ADD COLUMN user_role VARCHAR(20) NOT NULL DEFAULT 'user',
  ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_users_status ON users(account_status);
