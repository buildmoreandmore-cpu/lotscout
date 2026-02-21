import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'

  const { data: lots, error } = await supabase.from('lots').select('*').order('lead_score', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (format === 'csv') {
    const headers = Object.keys(lots?.[0] || {})
    const csv = [headers.join(','), ...(lots || []).map(lot =>
      headers.map(h => JSON.stringify((lot as any)[h] ?? '')).join(',')
    )].join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=lotscout-export.csv' },
    })
  }

  return NextResponse.json(lots)
}
