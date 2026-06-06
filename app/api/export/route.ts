import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'
  const status = searchParams.get('status')
  const county = searchParams.get('county')
  const city = searchParams.get('city')

  let query = supabase.from('lots').select('*').order('lead_score', { ascending: false })
  if (status && status !== 'all') query = query.eq('lead_status', status)
  if (county && county !== 'all') query = query.eq('county', county)
  if (city && city !== 'all') query = query.ilike('property_city', city)

  const { data: lots, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (format === 'csv') {
    const headers = Object.keys(lots?.[0] || {})
    const csv = [headers.join(','), ...(lots || []).map((lot: any) =>
      headers.map(h => JSON.stringify(lot[h] ?? '')).join(',')
    )].join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=lotscout-export.csv' },
    })
  }

  return NextResponse.json(lots)
}
