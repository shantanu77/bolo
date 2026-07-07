import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken } from '@/lib/email-verification'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const baseUrl = req.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?verified=missing`)
  }

  const verified = await verifyEmailToken(token)
  return NextResponse.redirect(`${baseUrl}/login?verified=${verified ? '1' : 'invalid'}`)
}
