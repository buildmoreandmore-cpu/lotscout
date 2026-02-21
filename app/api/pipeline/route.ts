import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const statuses = ['new', 'contacted', 'interested', 'under_contract', 'closed', 'dead']
  const pipeline: Record<string, any> = {}
  
  for (const status of statuses) {
    const lots = await prisma.lot.findMany({
      where: { leadStatus: status },
      include: { contacts: { orderBy: { date: 'desc' }, take: 1 }, deal: true },
      orderBy: { leadScore: 'desc' },
    })
    pipeline[status] = { count: lots.length, lots }
  }

  const summary = await prisma.lot.groupBy({
    by: ['leadStatus'],
    _count: { id: true },
  })

  // Follow-ups needed: lots contacted more than 7 days ago with no recent follow-up
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const needFollowUp = await prisma.lot.findMany({
    where: {
      leadStatus: { in: ['contacted', 'interested'] },
      contacts: { some: { date: { lt: sevenDaysAgo } } },
    },
    include: { contacts: { orderBy: { date: 'desc' }, take: 1 } },
    orderBy: { leadScore: 'desc' },
  })

  return NextResponse.json({ pipeline, summary, needFollowUp })
}
