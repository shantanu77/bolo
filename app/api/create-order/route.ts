import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { execute } from '@/lib/db'
import {
  ensurePaymentOrdersTable,
  getRazorpayClient,
  PRO_PLAN_AMOUNT_PAISE,
  PRO_PLAN_CURRENCY,
} from '@/lib/billing'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const requestedAmount = Number(body.amount ?? PRO_PLAN_AMOUNT_PAISE)
  const amount = PRO_PLAN_AMOUNT_PAISE

  if (!Number.isFinite(requestedAmount) || requestedAmount < 100) {
    return NextResponse.json({ error: 'Amount must be at least 100 paise' }, { status: 400 })
  }
  if (requestedAmount !== amount) {
    return NextResponse.json({ error: 'Invalid plan amount' }, { status: 400 })
  }

  await ensurePaymentOrdersTable()

  try {
    const razorpay = getRazorpayClient()
    const receipt = `pro_${session.user.id.slice(0, 8)}_${Date.now()}`.slice(0, 40)
    const order = await razorpay.orders.create({
      amount,
      currency: PRO_PLAN_CURRENCY,
      receipt,
      notes: {
        user_id: session.user.id,
        plan: 'pro_monthly',
      },
    })

    await execute(
      `INSERT INTO payment_orders
       (user_id, plan, amount, currency, receipt, razorpay_order_id, status)
       VALUES (?, 'pro_monthly', ?, ?, ?, ?, 'created')`,
      [session.user.id, amount, PRO_PLAN_CURRENCY, receipt, order.id]
    )

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error('Razorpay order creation failed', error)
    return NextResponse.json({ error: 'Could not create payment order' }, { status: 500 })
  }
}
