import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const contact = await prisma.contact.create({
    data: {
      lotId: params.id,
      method: body.method,
      notes: body.notes,
      campaign: body.campaign,
      response: body.response,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    },
  })

  // Auto-update lead status if it's still 'new'
  const lot = await prisma.lot.findUnique({ where: { id: params.id } })
  if (lot && lot.leadStatus === 'new') {
    await prisma.lot.update({ where: { id: params.id }, data: { leadStatus: 'contacted' } })
  }

  return NextResponse.json(contact, { status: 201 })
}
