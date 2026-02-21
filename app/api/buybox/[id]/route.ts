import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  if (body.zonings) body.zonings = JSON.stringify(body.zonings)
  if (body.target_zips) body.target_zips = JSON.stringify(body.target_zips)
  if (body.exclude_zonings) body.exclude_zonings = JSON.stringify(body.exclude_zonings)
  const { data, error } = await supabase.from('buy_boxes').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('buy_boxes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
