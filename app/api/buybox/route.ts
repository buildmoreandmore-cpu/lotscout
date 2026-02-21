import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const buyBoxes = await prisma.buyBox.findMany({ orderBy: { isDefault: 'desc' } })
  return NextResponse.json(buyBoxes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const buyBox = await prisma.buyBox.create({
    data: {
      name: body.name,
      zonings: JSON.stringify(body.zonings || []),
      minLotSizeAcres: body.minLotSizeAcres || 0.10,
      maxLotSizeAcres: body.maxLotSizeAcres || 0.35,
      propertyTypes: body.propertyTypes || 'vacant,unimproved',
      targetZips: JSON.stringify(body.targetZips || []),
      maxTaxValue: body.maxTaxValue || 100000,
      absenteeOnly: body.absenteeOnly || false,
      excludeZonings: JSON.stringify(body.excludeZonings || []),
      minLotSizeSqft: body.minLotSizeSqft || 4000,
      maxLotSizeSqft: body.maxLotSizeSqft || null,
    },
  })
  return NextResponse.json(buyBox, { status: 201 })
}
