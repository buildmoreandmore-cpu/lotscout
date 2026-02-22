import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalLots },
    { count: delinquentCount },
    { count: absenteeCount },
    { data: allLots },
    { data: deals },
    { data: pipelineDeals },
  ] = await Promise.all([
    supabase.from('lots').select('*', { count: 'exact', head: true }),
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('tax_status', 'delinquent'),
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('is_absentee_owner', true),
    supabase.from('lots').select('lead_status, lead_score, property_zip, tax_assessed_value'),
    supabase.from('deals').select('*').eq('status', 'closed'),
    supabase.from('deals').select('max_lot_offer').neq('status', 'closed'),
  ])

  const lots = allLots || []

  // Status counts
  const statusCounts: Record<string, number> = {}
  for (const lot of lots) {
    statusCounts[lot.lead_status] = (statusCounts[lot.lead_status] || 0) + 1
  }

  // Zip breakdown
  const zipMap: Record<string, { count: number; totalScore: number; totalTax: number }> = {}
  for (const lot of lots) {
    const zip = lot.property_zip
    if (!zipMap[zip]) zipMap[zip] = { count: 0, totalScore: 0, totalTax: 0 }
    zipMap[zip].count++
    zipMap[zip].totalScore += lot.lead_score || 0
    zipMap[zip].totalTax += lot.tax_assessed_value || 0
  }
  const zipBreakdown = Object.entries(zipMap).map(([zip, v]) => ({
    zip,
    count: v.count,
    avgScore: Math.round(v.totalScore / v.count),
    avgTaxValue: Math.round(v.totalTax / v.count),
  }))

  // Score stats
  const scores = lots.map(l => l.lead_score || 0)
  const scoreStats = {
    _avg: { leadScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 },
    _max: { leadScore: scores.length ? Math.max(...scores) : 0 },
    _min: { leadScore: scores.length ? Math.min(...scores) : 0 },
  }

  const closedDeals = deals || []
  const totalRevenue = closedDeals.reduce((sum: number, d: any) => sum + (d.wholesale_fee || 0), 0)
  const pipelineValue = (pipelineDeals || []).reduce((sum: number, d: any) => sum + (d.max_lot_offer || 0), 0)

  return NextResponse.json({
    totalLots: totalLots || 0,
    statusCounts,
    zipBreakdown,
    scoreStats,
    delinquentCount: delinquentCount || 0,
    absenteeCount: absenteeCount || 0,
    closedDeals: closedDeals.length,
    totalRevenue,
    pipelineValue,
  })
}
