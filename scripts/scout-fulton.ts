/**
 * LotScout — Fulton County Scanner
 * 
 * Queries Fulton County 2018 Tax Parcels from ArcGIS Online FeatureServer.
 * Data: https://services1.arcgis.com/AQDHTHDrZzfsFsB5/arcgis/rest/services/Tax_Parcels2018/FeatureServer/0
 * 
 * Note: 2018 data — ownership may have changed but parcel structure is stable.
 * Filter by TaxDist codes covering our target neighborhoods (SW Atlanta).
 */

const FULTON_API = 'https://services1.arcgis.com/AQDHTHDrZzfsFsB5/arcgis/rest/services/Tax_Parcels2018/FeatureServer/0/query'

const SUPABASE_URL = 'https://vbwcatbixcgakdwgdavl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2NhdGJpeGNnYWtkd2dkYXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MzM4NywiZXhwIjoyMDg3MjY5Mzg3fQ.2j0q61nh9cJJa420-SxBEJMA2SuPRft6azAPNT8-C_M'

const COMPOSIO_API = 'https://backend.composio.dev/api/v2/actions/GMAIL_SEND_EMAIL/execute'
const COMPOSIO_KEY = 'ak_icRzYQpAsFuxXVExa4xQ'
const GMAIL_CONNECTION = '18437286-5cc1-41c1-b414-2463391436eb'
const NOTIFICATION_EMAIL = 'wchoi0745@gmail.com'

const SKIP_OWNERS = [
  'CITY OF ATLANTA', 'FULTON COUNTY', 'STATE OF GEORGIA', 'GEORGIA POWER',
  'MARTA', 'DEPARTMENT OF', 'BOARD OF EDUCATION', 'UNITED STATES',
  'COMMUNITY ASSOC', 'HOMEOWNERS ASSOC', 'CONDOMINIUM',
]

// Target TaxDist codes for SW Atlanta (30310, 30312, 30314 area)
// 05W = City of Atlanta West, 05S = South, 05T = City Trust areas
// We grab all City of Atlanta districts and filter by neighborhood
const TARGET_DISTRICTS = ['05W', '05S', '05', '05T', '05E']

// Target neighborhoods (from seed data)
// SW Atlanta neighborhoods for 30310/30314
const TARGET_NEIGHBORHOODS = [
  'West End', 'Pittsburgh', 'Adair Park', 'Capitol View',
  'Mechanicsville', 'Sylvan Hills', 'Oakland City',
  'Vine City', 'English Avenue', 'Grove Park',
]

interface FultonParcel {
  ParcelID: string
  Address: string
  Owner: string
  OwnerAddr1: string
  OwnerAddr2: string
  LandAcres: number
  TotAssess: number
  LandAssess: number
  ImprAssess: number
  ClassCode: string
  LUCode: string
  NbrHood: string
  TaxDist: string
  Subdiv: string
}

function isSkippedOwner(name: string): boolean {
  const u = (name || '').toUpperCase()
  return SKIP_OWNERS.some(s => u.includes(s))
}

function scoreLot(p: FultonParcel): number {
  let score = 0

  // ClassCode scoring (R3=vacant residential is our target)
  const cls = (p.ClassCode || '').toUpperCase()
  if (cls === 'R3' || cls === 'R4' || cls === 'R5') score += 22
  else if (cls === 'R2') score += 12

  // Lot size sweet spot (20 pts)
  const acres = p.LandAcres
  if (acres >= 0.14 && acres <= 0.22) score += 20
  else if (acres >= 0.12 && acres <= 0.25) score += 15
  else if (acres >= 0.10 && acres <= 0.30) score += 10
  else if (acres >= 0.08 && acres <= 0.35) score += 5

  // Absentee detection - address starts with 0 or owner mail != site address
  const addr = (p.Address || '').toUpperCase()
  const mail = (p.OwnerAddr1 || '').toUpperCase()
  const absentee = mail && addr && !mail.includes(addr.split(' ')[0])
  if (absentee) score += 15

  // Low assessed value (15 pts)
  if (p.TotAssess === 0) score += 15
  else if (p.TotAssess < 10000) score += 12
  else if (p.TotAssess < 25000) score += 8
  else if (p.TotAssess < 50000) score += 5

  // Vacant lot indicators (10 pts)
  if (addr.startsWith('0 ') || addr.includes('REAR') || addr.includes('LOT')) score += 10

  // ImprAssess = 0 confirms vacant (5 pts bonus)
  if (p.ImprAssess === 0) score += 5

  // Fulton SW Atlanta premium (10 pts)
  score += 10

  return Math.min(score, 100)
}

async function queryFulton(): Promise<FultonParcel[]> {
  const where = `ImprAssess=0 AND LandAcres>=0.13 AND LandAcres<=0.20 AND TotAssess<100000 AND ClassCode='R3'`
  const fields = 'ParcelID,Address,Owner,OwnerAddr1,OwnerAddr2,LandAcres,TotAssess,LandAssess,ImprAssess,ClassCode,LUCode,NbrHood,TaxDist,Subdiv'

  let all: FultonParcel[] = []
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      where, outFields: fields, f: 'json',
      resultRecordCount: '1000', resultOffset: String(offset),
      returnGeometry: 'false', orderByFields: 'TotAssess ASC',
    })
    const res = await fetch(`${FULTON_API}?${params}`)
    const data = await res.json()
    const batch = (data.features || []).map((f: any) => f.attributes as FultonParcel)
    if (batch.length === 0) break
    all.push(...batch)
    offset += batch.length
    console.log(`  Fetched ${all.length} so far...`)
    if (batch.length < 1000) break
  }
  return all
}

async function getExistingParcelIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  let offset = 0
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lots?select=parcel_id&county=eq.Fulton&offset=${offset}&limit=1000`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    for (const row of data) ids.add(row.parcel_id)
    offset += data.length
    if (data.length < 1000) break
  }
  return ids
}

async function insertLots(lots: any[]): Promise<number> {
  let inserted = 0
  for (let i = 0; i < lots.length; i += 100) {
    const batch = lots.slice(i, i + 100)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lots`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (res.ok) inserted += batch.length
    else console.error(`⚠️ Batch error: ${(await res.text()).slice(0, 200)}`)
  }
  return inserted
}

async function sendEmail(subject: string, body: string): Promise<void> {
  const res = await fetch(COMPOSIO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': COMPOSIO_KEY },
    body: JSON.stringify({
      connectedAccountId: GMAIL_CONNECTION,
      input: { recipient_email: NOTIFICATION_EMAIL, subject, body },
    }),
  })
  const data = await res.json()
  console.log(data.successfull || data.successful ? '📧 Email sent' : '❌ Email failed')
}

async function main() {
  console.log(`🔍 LotScout — Fulton County Scanner — ${new Date().toISOString()}`)

  const parcels = await queryFulton()
  console.log(`📦 Total vacant residential parcels: ${parcels.length}`)

  // Filter out government/HOA owners
  const filtered = parcels.filter(p => !isSkippedOwner(p.Owner))
  console.log(`🏠 After owner filter: ${filtered.length}`)

  // Score
  const scored = filtered
    .map(p => ({ parcel: p, score: scoreLot(p) }))
    .filter(s => s.score >= 40) // Lower threshold for Fulton since data is older
    .sort((a, b) => b.score - a.score)

  console.log(`🔥 Qualified leads (≥40): ${scored.length}`)

  // Check existing
  const existing = await getExistingParcelIds()
  console.log(`📊 Already in DB: ${existing.size}`)

  const newLeads = scored.filter(s => !existing.has(s.parcel.ParcelID.trim()))
  console.log(`🆕 New leads: ${newLeads.length}`)

  if (newLeads.length === 0) {
    console.log('✅ No new Fulton leads')
    return
  }

  // Insert
  const rows = newLeads.map(({ parcel: p, score }) => {
    const addr = (p.Address || '').toUpperCase()
    const mail = (p.OwnerAddr1 || '').toUpperCase()
    const absentee = !!(mail && addr && !mail.includes(addr.split(' ')[0]))

    return {
      parcel_id: p.ParcelID.trim(),
      owner_name: p.Owner,
      owner_mail_address: p.OwnerAddr1,
      owner_mail_city: null,
      owner_mail_state: 'GA',
      owner_mail_zip: null,
      property_address: p.Address,
      property_city: 'Atlanta',
      property_state: 'GA',
      property_zip: '30310', // Will need refinement per neighborhood
      county: 'Fulton',
      zoning: p.ClassCode,
      lot_size_acres: p.LandAcres,
      lot_size_sqft: Math.round(p.LandAcres * 43560),
      property_class: p.ClassCode,
      tax_assessed_value: p.TotAssess,
      is_absentee_owner: absentee,
      lead_score: score,
      lead_status: 'new',
      neighborhood: p.Subdiv || p.NbrHood,
    }
  })

  const inserted = await insertLots(rows)
  console.log(`✅ Inserted ${inserted} Fulton lots into Supabase`)

  // Email
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  await sendEmail(
    `LotScout: ${newLeads.length} Fulton County lots added`,
    `${newLeads.length} new vacant lots from Fulton County added to LotScout — ${today}\n\nQuick stats:\n- New lots: ${newLeads.length}\n- Highest score: ${newLeads[0]?.score || 0}/100\n- Total in database: ${existing.size + newLeads.length}\n\nView: https://lotscout.vercel.app\n\n— LotScout`
  )

  console.log('🏁 Done')
}

main().catch(console.error)
