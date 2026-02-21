import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  const deleted = await prisma.lot.deleteMany({ where: { isSample: true } })
  return NextResponse.json({ deleted: deleted.count })
}
