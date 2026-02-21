import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLeadScore } from '@/lib/scoring'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const buyBoxId = searchParams.get('buybox')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'leadScore'
  const sortDir = searchParams.get('sortDir') || 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: any = {}

  if (status && status !== 'all') {
    where.leadStatus = status
  }

  if (search) {
    where.OR = [
      { ownerName: { contains: search } },
      { propertyAddress: { contains: search } },
      { parcelId: { contains: search } },
      { neighborhood: { contains: search } },
    ]
  }

  if (buyBoxId) {
    const buyBox = await prisma.buyBox.findUnique({ where: { id: buyBoxId } })
    if (buyBox) {
      const zonings = JSON.parse(buyBox.zonings || '[]')
      const targetZips = JSON.parse(buyBox.targetZips || '[]')
      const excludeZonings = JSON.parse(buyBox.excludeZonings || '[]')

      if (targetZips.length > 0) where.propertyZip = { in: targetZips }
      if (zonings.length > 0) where.zoning = { in: zonings }
      if (buyBox.minLotSizeAcres) where.lotSizeAcres = { gte: buyBox.minLotSizeAcres }
      if (buyBox.maxLotSizeAcres) {
        where.lotSizeAcres = { ...where.lotSizeAcres, lte: buyBox.maxLotSizeAcres }
      }
      if (buyBox.maxTaxValue) where.taxAssessedValue = { lte: buyBox.maxTaxValue }
      where.yearBuilt = null
    }
  }

  const orderBy: any = {}
  orderBy[sortBy] = sortDir

  const [lots, total] = await Promise.all([
    prisma.lot.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { contacts: { orderBy: { date: 'desc' }, take: 1 }, comps: true, deal: true },
    }),
    prisma.lot.count({ where }),
  ])

  return NextResponse.json({ lots, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const neighborhoodScores = settings ? JSON.parse(settings.neighborhoodScores) : {}

  // Detect absentee owner
  const isAbsenteeOwner = body.ownerMailAddress && body.propertyAddress &&
    body.ownerMailAddress.toLowerCase() !== body.propertyAddress.toLowerCase()

  // Calculate lot size in sqft if only acres provided
  const lotSizeSqft = body.lotSizeSqft || (body.lotSizeAcres ? body.lotSizeAcres * 43560 : null)
  const lotSizeAcres = body.lotSizeAcres || (body.lotSizeSqft ? body.lotSizeSqft / 43560 : null)

  const score = calculateLeadScore({
    zoning: body.zoning,
    lotSizeAcres,
    isAbsenteeOwner: isAbsenteeOwner || false,
    taxDelinquentYrs: body.taxDelinquentYrs || 0,
    lastSaleDate: body.lastSaleDate,
    propertyZip: body.propertyZip,
    neighborhood: body.neighborhood,
  }, { neighborhoodScores })

  const lot = await prisma.lot.create({
    data: {
      ...body,
      lotSizeAcres,
      lotSizeSqft,
      isAbsenteeOwner: isAbsenteeOwner || false,
      leadScore: score,
      lastSaleDate: body.lastSaleDate ? new Date(body.lastSaleDate) : null,
    },
  })

  return NextResponse.json(lot, { status: 201 })
}
