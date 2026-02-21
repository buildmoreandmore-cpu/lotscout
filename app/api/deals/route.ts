import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel, camelToSnake } from '@/lib/transform'

export async function GET() {
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch associated lots
  const lotIds = (deals || []).map(d => d.lot_id).filter(Boolean)
  const { data: lots } = lotIds.length > 0
    ? await supabase.from('lots').select('id, property_address, property_zip, owner_name, lead_score').in('id', lotIds)
    : { data: [] }

  const lotsById: Record<string, any> = {}
  for (const lot of (lots || [])) lotsById[lot.id] = snakeToCamel(lot)

  const result = (deals || []).map(d => ({
    ...snakeToCamel(d),
    lot: lotsById[d.lot_id] || null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = camelToSnake(await req.json())
  const { data, error } = await supabase.from('deals').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data), { status: 201 })
}
