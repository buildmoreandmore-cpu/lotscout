import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const deals = await prisma.deal.findMany({
    include: { lot: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const totalBuildCost = (body.buildSqft || 1600) * (body.buildCostPerSqft || 165)
  const maxLotOffer = (body.estimatedArv || 0) * (body.arvMultiplier || 0.80) - totalBuildCost - (body.wholesaleFee || 10000)

  const deal = await prisma.deal.create({
    data: {
      lotId: body.lotId,
      estimatedArv: body.estimatedArv,
      buildCostPerSqft: body.buildCostPerSqft || 165,
      buildSqft: body.buildSqft || 1600,
      totalBuildCost,
      maxLotOffer: Math.max(0, maxLotOffer),
      wholesaleFee: body.wholesaleFee || 10000,
      builderMargin: body.builderMargin || 0.20,
      offerPrice: body.offerPrice,
      notes: body.notes,
    },
  })

  // Update lot status
  await prisma.lot.update({
    where: { id: body.lotId },
    data: { leadStatus: 'interested' },
  })

  return NextResponse.json(deal, { status: 201 })
}
