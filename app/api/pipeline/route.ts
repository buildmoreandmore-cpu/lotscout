import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { snakeToCamel } from '@/lib/transform'

export async function GET() {
  // Get all lots with their latest contact (raise default 1000 limit)
  const { data: lots, error } = await supabase
    .from('lots')
    .select('id, parcel_id, owner_name, property_address, property_zip, lead_score, lead_status, tax_assessed_value, neighborhood')
    .order('lead_score', { ascending: false })
    .limit(15000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get contacts for all lots (latest per lot)
  const { data: contacts } = await supabase
    .from('contacts')
    .select('lot_id, date, method, follow_up_date')
    .order('date', { ascending: false })

  // Get deals
  const { data: deals } = await supabase
    .from('deals')
    .select('lot_id, max_lot_offer, wholesale_fee')

  // Map contacts and deals to lots
  const contactsByLot: Record<string, any[]> = {}
  for (const c of (contacts || [])) {
    if (!contactsByLot[c.lot_id]) contactsByLot[c.lot_id] = []
    contactsByLot[c.lot_id].push(c)
  }

  const dealsByLot: Record<string, any> = {}
  for (const d of (deals || [])) {
    dealsByLot[d.lot_id] = d
  }

  // Build pipeline grouped by status
  const pipeline: Record<string, { count: number; lots: any[] }> = {}
  const statusCounts: Record<string, number> = {}

  for (const lot of (lots || [])) {
    const status = lot.lead_status || 'new'
    if (!pipeline[status]) pipeline[status] = { count: 0, lots: [] }
    pipeline[status].count++
    statusCounts[status] = (statusCounts[status] || 0) + 1

    const lotContacts = (contactsByLot[lot.id] || []).map(c => ({
      date: c.date,
      method: c.method,
    }))

    // Only include first 100 lots per stage to keep response size reasonable
    if (pipeline[status].lots.length < 100) {
      pipeline[status].lots.push(snakeToCamel({
        ...lot,
        contacts: lotContacts,
        deal: dealsByLot[lot.id] ? snakeToCamel(dealsByLot[lot.id]) : null,
      }))
    }
  }

  // Find lots needing follow-up (contacted but no contact in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const needFollowUp = (lots || [])
    .filter(lot => {
      if (!['contacted', 'interested'].includes(lot.lead_status)) return false
      const lotContacts = contactsByLot[lot.id] || []
      if (lotContacts.length === 0) return true
      return lotContacts[0].date < sevenDaysAgo
    })
    .map(lot => snakeToCamel({
      ...lot,
      contacts: (contactsByLot[lot.id] || []).map(c => ({ date: c.date, method: c.method })),
      deal: dealsByLot[lot.id] ? snakeToCamel(dealsByLot[lot.id]) : null,
    }))

  const summary = Object.entries(statusCounts).map(([status, count]) => ({
    leadStatus: status,
    _count: { id: count },
  }))

  return NextResponse.json({ pipeline, summary, needFollowUp })
}
