import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const status = searchParams.get('status')
  const buyBoxId = searchParams.get('buybox')

  const where: any = {}
  if (status && status !== 'all') where.leadStatus = status
  if (type === 'absentee') where.isAbsenteeOwner = true
  if (type === 'delinquent') where.taxStatus = 'delinquent'

  if (buyBoxId) {
    const buyBox = await prisma.buyBox.findUnique({ where: { id: buyBoxId } })
    if (buyBox) {
      const targetZips = JSON.parse(buyBox.targetZips || '[]')
      if (targetZips.length > 0) where.propertyZip = { in: targetZips }
    }
  }

  const lots = await prisma.lot.findMany({ where, orderBy: { leadScore: 'desc' } })

  const csvRows = [
    ['Parcel ID', 'Owner Name', 'Owner Mail Address', 'Owner Mail City', 'Owner Mail State', 'Owner Mail Zip', 'Property Address', 'Property City', 'Property Zip', 'County', 'Zoning', 'Lot Acres', 'Tax Value', 'Tax Status', 'Lead Score', 'Lead Status', 'Neighborhood'].join(','),
    ...lots.map(l => [
      l.parcelId, `"${l.ownerName}"`, `"${l.ownerMailAddress || ''}"`, `"${l.ownerMailCity || ''}"`, l.ownerMailState || '', l.ownerMailZip || '',
      `"${l.propertyAddress}"`, `"${l.propertyCity || ''}"`, l.propertyZip, l.county, l.zoning || '',
      l.lotSizeAcres?.toFixed(2) || '', l.taxAssessedValue || '', l.taxStatus, l.leadScore, l.leadStatus, `"${l.neighborhood || ''}"`
    ].join(','))
  ].join('\n')

  return new NextResponse(csvRows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lotscout-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
