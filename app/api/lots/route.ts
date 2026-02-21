import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel } from '@/lib/transform'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const rawSortBy = searchParams.get('sortBy') || 'leadScore'
  // Convert camelCase sort field to snake_case
  const sortBy = rawSortBy.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
  const sortDir = searchParams.get('sortDir') || 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase.from('lots').select('*', { count: 'exact' })

  if (status && status !== 'all') query = query.eq('lead_status', status)
  if (search) query = query.or(`owner_name.ilike.%${search}%,property_address.ilike.%${search}%,parcel_id.ilike.%${search}%`)

  query = query.order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * limit, page * limit - 1)

  const { data: lots, count: total, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    lots: snakeToCamel(lots || []),
    total: total || 0,
    page, limit,
    pages: Math.ceil((total || 0) / limit),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const isAbsenteeOwner = body.owner_mail_address && body.property_address &&
    body.owner_mail_address.toLowerCase() !== body.property_address.toLowerCase()

  const lot_size_sqft = body.lot_size_sqft || (body.lot_size_acres ? body.lot_size_acres * 43560 : null)
  const lot_size_acres = body.lot_size_acres || (body.lot_size_sqft ? body.lot_size_sqft / 43560 : null)

  const { data, error } = await supabase.from('lots').insert({
    ...body,
    lot_size_acres,
    lot_size_sqft,
    is_absentee_owner: isAbsenteeOwner || false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
