import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel, camelToSnake } from '@/lib/transform'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from('contacts').select('*').eq('lot_id', params.id).order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = camelToSnake(await req.json())
  body.lot_id = params.id
  const { data, error } = await supabase.from('contacts').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data), { status: 201 })
}
