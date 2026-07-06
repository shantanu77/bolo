import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLearningGuide } from '@/lib/learning-guides'

export async function GET(_req: NextRequest, { params }: { params: { guideId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guide = await getLearningGuide(session.user.id, params.guideId)
  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

  return NextResponse.json({ guide })
}
