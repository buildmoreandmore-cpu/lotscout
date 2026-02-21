import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data: any = { ...body }
  if (body.zonings) data.zonings = JSON.stringify(body.zonings)
  if (body.targetZips) data.targetZips = JSON.stringify(body.targetZips)
  if (body.excludeZonings) data.excludeZonings = JSON.stringify(body.excludeZonings)
  
  const buyBox = await prisma.buyBox.update({ where: { id: params.id }, data })
  return NextResponse.json(buyBox)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.buyBox.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
