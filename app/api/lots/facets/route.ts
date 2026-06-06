import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Always read live — dropdown options must reflect current data, not build time.
export const dynamic = 'force-dynamic'

/**
 * Distinct counties + cities for the Lots page filter dropdowns.
 * Pages through all rows (two short columns) so a city that only appears
 * beyond the first 1,000 rows isn't missed.
 */
export async function GET() {
  const cityByCounty = new Map<string, string>() // city -> county
  const counties = new Set<string>()

  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('lots')
      .select('county, property_city')
      .order('id', { ascending: true }) // stable sort so pagination can't skip rows
      .range(offset, offset + pageSize - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.county) counties.add(row.county)
      if (row.property_city) {
        // Title-case the label so ALL-CAPS GIS values (e.g. "DACULA") display
        // cleanly; the API filters case-insensitively so the value still matches.
        const city = String(row.property_city).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        cityByCounty.set(city, row.county || '')
      }
    }
    if (data.length < pageSize) break
    offset += data.length
  }

  const cities = Array.from(cityByCounty.entries())
    .map(([city, county]) => ({ city, county }))
    .sort((a, b) => a.city.localeCompare(b.city))

  return NextResponse.json({
    counties: Array.from(counties).sort(),
    cities,
  })
}
