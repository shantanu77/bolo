import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  ensureCategoryGenerationJobsTable,
  getCategoryGenerationJob,
  getCategoryGenerationResult,
} from '@/lib/category-generation'

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureCategoryGenerationJobsTable()

  const job = await getCategoryGenerationJob(params.jobId, session.user.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  if (job.status === 'succeeded' && job.category_id) {
    const result = await getCategoryGenerationResult(job.category_id)
    return NextResponse.json({ job, ...result })
  }

  return NextResponse.json({ job })
}
