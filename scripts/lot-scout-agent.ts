/**
 * LotScout Sub-Agent
 * 
 * Scans DeKalb County ArcGIS for vacant lots matching buy box,
 * scores them, inserts new leads into Supabase (lotscout.vercel.app),
 * sends email notification when new lots are added.
 * 
 * AI analysis powered by MiniMax.
 */

const DEKALB_API = 'https://dcgis.dekalbcountyga.gov/mapping/rest/services/TaxParcels/MapServer/0/query'

// MiniMax
const MINIMAX_API = 'https://api.minimax.io/v1/chat/completions'
const MINIMAX_KEY = 'sk-api-UQ3nXuR7dKCbSCWY5K8IB2kSmBl7jTNy6jLffMeSyYGNvONc'

// Supabase
const SUPABASE_URL = 'https://vbwcatbixcgakdwgdavl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2NhdGJpeGNnYWtkd2dkYXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MzM4NywiZXhwIjoyMDg3MjY5Mzg3fQ.2j0q61nh9cJJa420-SxBEJMA2SuPRft6azAPNT8-C_M'

// Email
const COMPOSIO_API = 'https://backend.composio.dev/api/v2/actions/GMAIL_SEND_EMAIL/execute'
const COMPOSIO_KEY = 'ak_icRzYQpAsFuxXVExa4xQ'
const GMAIL_CONNECTION = '18437286-5cc1-41c1-b414-2463391436eb'
const NOTIFICATION_EMAIL = 'wchoi0745@gmail.com'

const SKIP_OWNERS = [
  'DEKALB COUNTY', 'FULTON COUNTY', 'CITY OF', 'STATE HIGHWAY',
  'MARTA', 'GEORGIA POWER', 'CONDOMINIUM ASSOC', 'CONDO ASSOC',
  'HOMEOWNERS ASSOC', 'HOA', 'DEPARTMENT OF', 'BOARD OF EDUCATION',
  'UNITED STATES', 'COUNTY OF',
]

const BUY_BOX = {
  targetZips: ['30032', '30033', '30079'],
  minAcres: 0.13,
  maxAcres: 0.20,
  minSqft: 5700,
  maxSqft: 8800,
  maxTaxValue: 100_000,
  allowedZoningPrefixes: ['R-'],
  excludeZoningPrefixes: ['MR-'],
}

const NEIGHBORHOOD_SCORES: Record<string, number> = {
  '30079': 10, '30032': 9, '30033': 11,
}

interface Parcel {
  PARCELID: string; OWNERNME1: string; OWNERNME2: string | null
  SITEADDRESS: string; CITY: string; ZIP: string; ZONING: string
  ACREAGE: number; CNTASSDVAL: number; CLASSDSCRP: string; LANDUSE: string
  PSTLADDRESS: string; PSTLCITY: string; PSTLSTATE: string; PSTLZIP5: string
}

function isAbsentee(p: Parcel): boolean {
  return !!(p.ZIP && p.PSTLZIP5 && p.ZIP !== p.PSTLZIP5)
}
function isSkippedOwner(name: string): boolean {
  const u = (name || '').toUpperCase()
  return SKIP_OWNERS.some(s => u.includes(s))
}
function isResidentialZoning(z: string): boolean {
  if (!z) return false
  const upper = z.toUpperCase()
  if (BUY_BOX.excludeZoningPrefixes?.some(p => upper.startsWith(p))) return false
  return BUY_BOX.allowedZoningPrefixes.some(p => upper.startsWith(p))
}
function isInSqftRange(acres: number): boolean {
  const sqft = acres * 43560
  return sqft >= BUY_BOX.minSqft && sqft <= BUY_BOX.maxSqft
}

function scoreLot(p: Parcel): number {
  let score = 0
  const z = (p.ZONING || '').toUpperCase()
  if (z.includes('MR-2') || z.includes('R-5')) score += 25
  else if (z.includes('R-4') || z.includes('R-100')) score += 22
  else if (z.includes('R-3') || z.includes('R-85')) score += 18
  else if (z.includes('R-2') || z.includes('R-75')) score += 12
  else if (z.includes('R-1') || z.includes('R-60')) score += 8

  const acres = p.ACREAGE
  if (acres >= 0.14 && acres <= 0.22) score += 20
  else if (acres >= 0.12 && acres <= 0.25) score += 15
  else if (acres >= 0.10 && acres <= 0.30) score += 10
  else if (acres >= 0.08 && acres <= 0.35) score += 5

  if (isAbsentee(p)) score += 15

  if (p.CNTASSDVAL === 0) score += 15
  else if (p.CNTASSDVAL < 10000) score += 12
  else if (p.CNTASSDVAL < 25000) score += 8
  else if (p.CNTASSDVAL < 50000) score += 5

  score += Math.min(NEIGHBORHOOD_SCORES[p.ZIP] || 0, 15)

  const addr = (p.SITEADDRESS || '').toUpperCase()
  if (addr.startsWith('0 ') || addr.includes('REAR') || addr.includes('LOT')) score += 10

  return Math.min(score, 100)
}

async function queryDeKalb(): Promise<Parcel[]> {
  const zips = BUY_BOX.targetZips.map(z => `'${z}'`).join(',')
  const where = `ZIP IN (${zips}) AND ACREAGE >= ${BUY_BOX.minAcres} AND ACREAGE <= ${BUY_BOX.maxAcres} AND CNTASSDVAL < ${BUY_BOX.maxTaxValue}`
  const fields = 'PARCELID,OWNERNME1,OWNERNME2,SITEADDRESS,CITY,ZIP,ZONING,ACREAGE,CNTASSDVAL,CLASSDSCRP,LANDUSE,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5'
  let all: Parcel[] = []
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      where, outFields: fields, f: 'json',
      resultRecordCount: '2000', resultOffset: String(offset),
      returnGeometry: 'false', orderByFields: 'CNTASSDVAL ASC',
    })
    const res = await fetch(`${DEKALB_API}?${params}`)
    const data = await res.json()
    const batch = (data.features || []).map((f: any) => f.attributes as Parcel)
    if (batch.length === 0) break
    all.push(...batch)
    offset += batch.length
    if (batch.length < 2000) break
  }
  return all
}

async function getExistingParcelIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  let offset = 0
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lots?select=parcel_id&offset=${offset}&limit=1000`,
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
  // Supabase REST API: upsert in batches of 100
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
    if (res.ok) {
      inserted += batch.length
    } else {
      const err = await res.text()
      console.error(`⚠️ Batch insert error: ${err.slice(0, 200)}`)
    }
  }
  return inserted
}

async function askMiniMax(prompt: string): Promise<string> {
  try {
    const res = await fetch(MINIMAX_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_KEY}` },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: 'You are a real estate investment analyst specializing in Atlanta metro infill lot acquisition. Be concise.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800, temperature: 0.3,
      }),
    })
    const data = await res.json()
    if (data.error) return ''
    return data.choices?.[0]?.message?.content || ''
  } catch { return '' }
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
  const now = new Date()
  console.log(`🔍 LotScout Agent — ${now.toISOString()}`)

  // 1. Query DeKalb
  const parcels = await queryDeKalb()
  console.log(`📦 Raw parcels: ${parcels.length}`)

  // 2. Filter & score
  const scored = parcels
    .filter(p => isResidentialZoning(p.ZONING))
    .filter(p => isInSqftRange(p.ACREAGE))
    .filter(p => !isSkippedOwner(p.OWNERNME1))
    .map(p => ({ parcel: p, score: scoreLot(p), absentee: isAbsentee(p) }))
    .filter(s => s.score >= 50)
    .sort((a, b) => b.score - a.score)

  console.log(`🔥 Hot leads (≥50): ${scored.length}`)

  // 3. Check existing in Supabase
  const existing = await getExistingParcelIds()
  console.log(`📊 Already in DB: ${existing.size}`)

  const newLeads = scored.filter(s => !existing.has(s.parcel.PARCELID.trim()))
  console.log(`🆕 New leads: ${newLeads.length}`)

  if (newLeads.length === 0) {
    console.log('✅ No new leads — done')
    return
  }

  // 4. Insert into Supabase
  const rows = newLeads.map(({ parcel: p, score, absentee }) => ({
    parcel_id: p.PARCELID.trim(),
    owner_name: p.OWNERNME1,
    owner_mail_address: p.PSTLADDRESS,
    owner_mail_city: p.PSTLCITY,
    owner_mail_state: p.PSTLSTATE,
    owner_mail_zip: p.PSTLZIP5,
    property_address: p.SITEADDRESS,
    property_city: p.CITY || 'Decatur',
    property_state: 'GA',
    property_zip: p.ZIP,
    county: 'DeKalb',
    zoning: p.ZONING,
    lot_size_acres: p.ACREAGE,
    lot_size_sqft: Math.round(p.ACREAGE * 43560),
    property_class: p.CLASSDSCRP,
    tax_assessed_value: p.CNTASSDVAL,
    is_absentee_owner: absentee,
    lead_score: score,
    lead_status: 'new',
  }))

  const inserted = await insertLots(rows)
  console.log(`✅ Inserted ${inserted} lots into Supabase`)

  // 5. Send notification email (just the count + link)
  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const topScore = newLeads[0]?.score || 0
  const absenteeCount = newLeads.filter(l => l.absentee).length

  let emailBody = `${newLeads.length} new lots added to LotScout — ${today}

${newLeads.length} new vacant lots matching your buy box were found in DeKalb County and added to your dashboard.

Quick stats:
- New lots added: ${newLeads.length}
- Highest score: ${topScore}/100
- Absentee owners: ${absenteeCount}
- Total lots in database: ${existing.size + newLeads.length}

View them now: https://lotscout.vercel.app

— LotScout`

  await sendEmail(`LotScout: ${newLeads.length} new lots added`, emailBody)
  console.log('🏁 Done')
}

main().catch(console.error)
