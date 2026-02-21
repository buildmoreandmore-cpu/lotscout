import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel, camelToSnake } from '@/lib/transform'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = camelToSnake(await req.json())
  const { data, error } = await supabase.from('deals').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snakeToCamel(data))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('deals').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
