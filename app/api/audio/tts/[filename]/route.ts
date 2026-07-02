import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const filename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '')
  const filePath = path.join(process.cwd(), 'storage', 'tts', filename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':  'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
