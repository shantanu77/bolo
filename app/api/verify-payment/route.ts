import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createHmac, timingSafeEqual } from 'crypto'
import { authOptions } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import {
  ensurePaymentOrdersTable,
  PRO_PLAN_AMOUNT_PAISE,
  PRO_PLAN_DURATION_DAYS,
} from '@/lib/billing'

interface PaymentOrder {
  id: string
  user_id: string
  amount: number
  status: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = await req.json().catch(() => ({}))

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return NextResponse.json({ error: 'Payment verification is not configured' }, { status: 500 })
  }

  await ensurePaymentOrdersTable()

  const paymentOrder = await queryOne<PaymentOrder>(
    `SELECT id, user_id, amount, status
     FROM payment_orders
     WHERE razorpay_order_id = ? AND user_id = ?`,
    [razorpay_order_id, session.user.id]
  )

  if (!paymentOrder) {
    return NextResponse.json({ error: 'Payment order not found' }, { status: 404 })
  }

  if (paymentOrder.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true })
  }

  if (paymentOrder.amount !== PRO_PLAN_AMOUNT_PAISE) {
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
  }

  const expected = createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (!safeCompare(expected, String(razorpay_signature))) {
    await execute(
      `UPDATE payment_orders
       SET status = 'failed', error_message = 'Signature mismatch'
       WHERE id = ?`,
      [paymentOrder.id]
    )
    return NextResponse.json({ error: 'Payment signature mismatch' }, { status: 400 })
  }

  await execute(
    `UPDATE payment_orders
     SET status = 'paid', razorpay_payment_id = ?, razorpay_signature = ?, paid_at = NOW()
     WHERE id = ?`,
    [razorpay_payment_id, razorpay_signature, paymentOrder.id]
  )

  await execute(
    `UPDATE users
     SET subscription_tier = 'pro',
         subscription_ends = DATE_ADD(
           GREATEST(COALESCE(subscription_ends, NOW()), NOW()),
           INTERVAL ? DAY
         )
     WHERE id = ?`,
    [PRO_PLAN_DURATION_DAYS, session.user.id]
  )

  const updatedUser = await queryOne<{ subscription_ends: string | null }>(
    'SELECT subscription_ends FROM users WHERE id = ?',
    [session.user.id]
  )

  return NextResponse.json({
    success: true,
    subscription_tier: 'pro',
    subscription_ends: updatedUser?.subscription_ends ?? null,
  })
}

function safeCompare(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}
