import Razorpay from 'razorpay'
import { execute } from '@/lib/db'

export const PRO_PLAN_AMOUNT_PAISE = 49900
export const PRO_PLAN_CURRENCY = 'INR'
export const PRO_PLAN_DURATION_DAYS = 30

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export async function ensurePaymentOrdersTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id                VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id           VARCHAR(36) NOT NULL,
      plan              VARCHAR(30) NOT NULL DEFAULT 'pro_monthly',
      amount            INT NOT NULL,
      currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
      receipt           VARCHAR(40) NOT NULL,
      razorpay_order_id VARCHAR(80) NOT NULL UNIQUE,
      razorpay_payment_id VARCHAR(80),
      razorpay_signature TEXT,
      status            VARCHAR(20) NOT NULL DEFAULT 'created',
      error_message     TEXT,
      created_at        DATETIME NOT NULL DEFAULT NOW(),
      paid_at           DATETIME,
      updated_at        DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      INDEX idx_payment_orders_user (user_id),
      INDEX idx_payment_orders_status (status)
    )
  `)
}
