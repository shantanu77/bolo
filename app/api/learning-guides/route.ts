import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listLearningGuides } from '@/lib/learning-guides'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guides = await listLearningGuides(session.user.id)
  return NextResponse.json({ guides })
}
