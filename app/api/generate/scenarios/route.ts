import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createCategoryGenerationJob,
  ensureCategoryGenerationJobsTable,
  startCategoryGenerationJob,
} from '@/lib/category-generation'

// Creates a durable category-generation job and returns immediately.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureCategoryGenerationJobsTable()

  const contentType = req.headers.get('content-type') ?? ''
  let userRequest = ''
  let audio: Buffer | undefined
  let inputType: 'text' | 'audio' = 'text'

  if (contentType.includes('audio') || contentType.includes('octet-stream')) {
    inputType = 'audio'
    const body = await req.arrayBuffer()
    audio = Buffer.from(body)
  } else {
    const body = await req.json()
    userRequest = body.request ?? ''
    if (!userRequest || userRequest.length < 5) {
      return NextResponse.json({ error: 'Request too short' }, { status: 422 })
    }
  }

  const jobId = await createCategoryGenerationJob({
    userId: session.user.id,
    inputType,
    userRequest: inputType === 'text' ? userRequest : undefined,
  })

  startCategoryGenerationJob({
    jobId,
    userId: session.user.id,
    userRequest: inputType === 'text' ? userRequest : undefined,
    audio,
  })

  return NextResponse.json({
    job: {
      id: jobId,
      status: 'pending',
      progress_step: 'Queued',
      progress_percent: 5,
    },
  }, { status: 202 })
}
