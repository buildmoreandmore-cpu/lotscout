import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from('comps').select('*').eq('lot_id', params.id).order('sale_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const pricePerSqft = body.sqft > 0 ? body.sale_price / body.sqft : null
  const { data, error } = await supabase.from('comps').insert({ ...body, lot_id: params.id, price_per_sqft: pricePerSqft }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
