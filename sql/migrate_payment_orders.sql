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
  updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
