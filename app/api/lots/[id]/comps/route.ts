import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel, camelToSnake } from '@/lib/transform'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from('comps').select('*').eq('lot_id', params.id).order('sale_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = camelToSnake(await req.json())
  body.lot_id = params.id
  if (body.sqft > 0) body.price_per_sqft = body.sale_price / body.sqft
  const { data, error } = await supabase.from('comps').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data), { status: 201 })
}
