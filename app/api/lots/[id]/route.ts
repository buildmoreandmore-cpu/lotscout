import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel, camelToSnake } from '@/lib/transform'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from('lots').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch related data
  const [{ data: contacts }, { data: comps }, { data: deal }] = await Promise.all([
    supabase.from('contacts').select('*').eq('lot_id', params.id).order('date', { ascending: false }),
    supabase.from('comps').select('*').eq('lot_id', params.id).order('sale_date', { ascending: false }),
    supabase.from('deals').select('*').eq('lot_id', params.id).maybeSingle(),
  ])

  const lot = snakeToCamel(data)
  lot.contacts = snakeToCamel(contacts || [])
  lot.comps = snakeToCamel(comps || [])
  lot.deal = deal ? snakeToCamel(deal) : null
  return NextResponse.json(lot)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = camelToSnake(await req.json())
  const { data, error } = await supabase.from('lots').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('lots').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
