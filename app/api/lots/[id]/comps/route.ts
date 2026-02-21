import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const pricePerSqft = body.salePrice && body.sqft ? body.salePrice / body.sqft : null

  const comp = await prisma.comp.create({
    data: {
      lotId: params.id,
      address: body.address,
      salePrice: body.salePrice,
      sqft: body.sqft,
      saleDate: new Date(body.saleDate),
      pricePerSqft,
    },
  })
  return NextResponse.json(comp, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const compId = searchParams.get('compId')
  if (compId) {
    await prisma.comp.delete({ where: { id: compId } })
  }
  return NextResponse.json({ ok: true })
}
