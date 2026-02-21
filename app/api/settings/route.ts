import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: 'default', neighborhoodScores: '{}' },
    })
  }
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  if (body.neighborhoodScores && typeof body.neighborhoodScores === 'object') {
    body.neighborhoodScores = JSON.stringify(body.neighborhoodScores)
  }
  const settings = await prisma.settings.update({
    where: { id: 'default' },
    data: body,
  })
  return NextResponse.json(settings)
}
