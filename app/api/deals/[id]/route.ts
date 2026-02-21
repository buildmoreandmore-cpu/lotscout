import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  
  const existing = await prisma.deal.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buildSqft = body.buildSqft ?? existing.buildSqft
  const buildCostPerSqft = body.buildCostPerSqft ?? existing.buildCostPerSqft
  const totalBuildCost = buildSqft * buildCostPerSqft
  const estimatedArv = body.estimatedArv ?? existing.estimatedArv ?? 0
  const wholesaleFee = body.wholesaleFee ?? existing.wholesaleFee
  const maxLotOffer = estimatedArv * 0.80 - totalBuildCost - wholesaleFee

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: { ...body, totalBuildCost, maxLotOffer: Math.max(0, maxLotOffer) },
  })

  // Sync lot status with deal status
  if (body.status) {
    const statusMap: Record<string, string> = {
      offered: 'interested',
      accepted: 'under_contract',
      closed: 'closed',
    }
    if (statusMap[body.status]) {
      await prisma.lot.update({ where: { id: deal.lotId }, data: { leadStatus: statusMap[body.status] } })
    }
  }

  return NextResponse.json(deal)
}
