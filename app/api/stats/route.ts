import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const [totalLots, statusCounts, zipCounts, scoreCounts, delinquentCount, absenteeCount] = await Promise.all([
    prisma.lot.count(),
    prisma.lot.groupBy({ by: ['leadStatus'], _count: { id: true } }),
    prisma.lot.groupBy({ by: ['propertyZip'], _count: { id: true }, _avg: { leadScore: true, taxAssessedValue: true } }),
    prisma.lot.aggregate({ _avg: { leadScore: true }, _max: { leadScore: true }, _min: { leadScore: true } }),
    prisma.lot.count({ where: { taxStatus: 'delinquent' } }),
    prisma.lot.count({ where: { isAbsenteeOwner: true } }),
  ])

  const deals = await prisma.deal.findMany({ where: { status: 'closed' } })
  const totalRevenue = deals.reduce((sum, d) => sum + (d.wholesaleFee || 0), 0)

  const pipelineValue = await prisma.deal.aggregate({
    where: { status: { not: 'closed' } },
    _sum: { maxLotOffer: true },
  })

  return NextResponse.json({
    totalLots,
    statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s.leadStatus]: s._count.id }), {} as Record<string, number>),
    zipBreakdown: zipCounts.map(z => ({
      zip: z.propertyZip,
      count: z._count.id,
      avgScore: Math.round(z._avg.leadScore || 0),
      avgTaxValue: Math.round(z._avg.taxAssessedValue || 0),
    })),
    scoreStats: scoreCounts,
    delinquentCount,
    absenteeCount,
    closedDeals: deals.length,
    totalRevenue,
    pipelineValue: pipelineValue._sum.maxLotOffer || 0,
  })
}
