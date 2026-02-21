import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  if (body.neighborhood_scores && typeof body.neighborhood_scores === 'object') {
    body.neighborhood_scores = JSON.stringify(body.neighborhood_scores)
  }
  const { data, error } = await supabase.from('settings').update(body).eq('id', 'default').select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
