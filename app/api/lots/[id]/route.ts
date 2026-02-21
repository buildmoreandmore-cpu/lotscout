import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLeadScore } from '@/lib/scoring'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const lot = await prisma.lot.findUnique({
    where: { id: params.id },
    include: {
      contacts: { orderBy: { date: 'desc' } },
      comps: { orderBy: { saleDate: 'desc' } },
      deal: true,
    },
  })
  if (!lot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(lot)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const neighborhoodScores = settings ? JSON.parse(settings.neighborhoodScores) : {}

  const existing = await prisma.lot.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const merged = { ...existing, ...body }
  const score = calculateLeadScore({
    zoning: merged.zoning,
    lotSizeAcres: merged.lotSizeAcres,
    isAbsenteeOwner: merged.isAbsenteeOwner,
    taxDelinquentYrs: merged.taxDelinquentYrs,
    lastSaleDate: merged.lastSaleDate,
    propertyZip: merged.propertyZip,
    neighborhood: merged.neighborhood,
  }, { neighborhoodScores })

  const lot = await prisma.lot.update({
    where: { id: params.id },
    data: { ...body, leadScore: score, lastSaleDate: body.lastSaleDate ? new Date(body.lastSaleDate) : undefined },
  })
  return NextResponse.json(lot)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.lot.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
