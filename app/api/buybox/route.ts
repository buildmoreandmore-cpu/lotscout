import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel } from '@/lib/transform'

export async function GET() {
  const { data, error } = await supabase.from('buy_boxes').select('*').order('is_default', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('buy_boxes').insert({
    name: body.name,
    zonings: JSON.stringify(body.zonings || []),
    min_lot_size_acres: body.min_lot_size_acres || 0.10,
    max_lot_size_acres: body.max_lot_size_acres || 0.35,
    property_types: body.property_types || 'vacant,unimproved',
    target_zips: JSON.stringify(body.target_zips || []),
    max_tax_value: body.max_tax_value || 100000,
    absentee_only: body.absentee_only || false,
    exclude_zonings: JSON.stringify(body.exclude_zonings || []),
    min_lot_size_sqft: body.min_lot_size_sqft || 4000,
    max_lot_size_sqft: body.max_lot_size_sqft || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
