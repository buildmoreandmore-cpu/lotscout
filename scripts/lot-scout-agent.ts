/**
 * LotScout Sub-Agent
 * 
 * Scans DeKalb County ArcGIS for vacant lots matching buy box criteria,
 * uses MiniMax to analyze top leads, emails summary when new lots found.
 * 
 * Run via cron — daily or on-demand.
 */

const DEKALB_API = 'https://dcgis.dekalbcountyga.gov/mapping/rest/services/TaxParcels/MapServer/0/query'
const MINIMAX_API = 'https://api.minimax.io/v1/chat/completions'
const MINIMAX_KEY = 'sk-api-UQ3nXuR7dKCbSCWY5K8IB2kSmBl7jTNy6jLffMeSyYGNvONc'
const MINIMAX_GROUP = '2023916550506951616'

const COMPOSIO_API = 'https://backend.composio.dev/api/v2/actions/GMAIL_SEND_EMAIL/execute'
const COMPOSIO_KEY = 'ak_icRzYQpAsFuxXVExa4xQ'
const GMAIL_CONNECTION = '18437286-5cc1-41c1-b414-2463391436eb'
const NOTIFICATION_EMAIL = 'wchoi0745@gmail.com'

// Owners to skip (government, utilities, condo associations)
const SKIP_OWNERS = [
  'DEKALB COUNTY', 'FULTON COUNTY', 'CITY OF', 'STATE HIGHWAY',
  'MARTA', 'GEORGIA POWER', 'CONDOMINIUM ASSOC', 'CONDO ASSOC',
  'HOMEOWNERS ASSOC', 'HOA', 'DEPARTMENT OF', 'BOARD OF EDUCATION',
  'UNITED STATES', 'COUNTY OF',
]

const BUY_BOX = {
  targetZips: ['30032', '30033', '30079'],
  minAcres: 0.10,
  maxAcres: 0.35,
  maxTaxValue: 100_000,
  allowedZoningPrefixes: ['R-', 'MR-'],
}

const NEIGHBORHOOD_SCORES: Record<string, number> = {
  '30079': 10, '30032': 9, '30033': 11,
}

interface Parcel {
  PARCELID: string
  OWNERNME1: string
  OWNERNME2: string | null
  SITEADDRESS: string
  CITY: string
  ZIP: string
  ZONING: string
  ACREAGE: number
  CNTASSDVAL: number
  CLASSDSCRP: string
  LANDUSE: string
  PSTLADDRESS: string
  PSTLCITY: string
  PSTLSTATE: string
  PSTLZIP5: string
}

interface ScoredLead extends Parcel {
  score: number
  absentee: boolean
}

function isAbsentee(p: Parcel): boolean {
  return !!(p.ZIP && p.PSTLZIP5 && p.ZIP !== p.PSTLZIP5)
}

function isSkippedOwner(name: string): boolean {
  const upper = (name || '').toUpperCase()
  return SKIP_OWNERS.some(s => upper.includes(s))
}

function isResidentialZoning(zoning: string): boolean {
  if (!zoning) return false
  const z = zoning.toUpperCase()
  return BUY_BOX.allowedZoningPrefixes.some(p => z.startsWith(p))
}

function scoreLot(p: Parcel): number {
  let score = 0
  const z = (p.ZONING || '').toUpperCase()

  // Zoning (25 pts)
  if (z.includes('MR-2') || z.includes('R-5')) score += 25
  else if (z.includes('R-4') || z.includes('R-100')) score += 22
  else if (z.includes('R-3') || z.includes('R-85')) score += 18
  else if (z.includes('R-2') || z.includes('R-75')) score += 12
  else if (z.includes('R-1') || z.includes('R-60')) score += 8

  // Lot size sweet spot (20 pts)
  const acres = p.ACREAGE
  if (acres >= 0.14 && acres <= 0.22) score += 20
  else if (acres >= 0.12 && acres <= 0.25) score += 15
  else if (acres >= 0.10 && acres <= 0.30) score += 10
  else if (acres >= 0.08 && acres <= 0.35) score += 5

  // Absentee (15 pts)
  if (isAbsentee(p)) score += 15

  // Low assessed value = likely vacant (15 pts)
  if (p.CNTASSDVAL === 0) score += 15
  else if (p.CNTASSDVAL < 10000) score += 12
  else if (p.CNTASSDVAL < 25000) score += 8
  else if (p.CNTASSDVAL < 50000) score += 5

  // Neighborhood (15 pts)
  score += Math.min(NEIGHBORHOOD_SCORES[p.ZIP] || 0, 15)

  // Address hints for vacant (10 pts)
  const addr = (p.SITEADDRESS || '').toUpperCase()
  if (addr.startsWith('0 ') || addr.includes('REAR') || addr.includes('LOT')) score += 10

  return Math.min(score, 100)
}

async function queryDeKalb(): Promise<Parcel[]> {
  const zips = BUY_BOX.targetZips.map(z => `'${z}'`).join(',')
  const where = [
    `ZIP IN (${zips})`,
    `ACREAGE >= ${BUY_BOX.minAcres}`,
    `ACREAGE <= ${BUY_BOX.maxAcres}`,
    `CNTASSDVAL < ${BUY_BOX.maxTaxValue}`,
  ].join(' AND ')

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

async function askMiniMax(prompt: string): Promise<string> {
  try {
    const res = await fetch(MINIMAX_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: 'You are a real estate investment analyst specializing in Atlanta metro infill lot acquisition for new construction. Be concise and actionable.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    })
    const data = await res.json()
    if (data.error) {
      console.error('⚠️ MiniMax error:', data.error.message)
      return '(MiniMax analysis unavailable — API key may need refresh)'
    }
    return data.choices?.[0]?.message?.content || '(No analysis returned)'
  } catch (err) {
    console.error('⚠️ MiniMax request failed:', err)
    return '(MiniMax analysis unavailable — request failed)'
  }
}

async function sendEmail(subject: string, body: string): Promise<void> {
  const res = await fetch(COMPOSIO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': COMPOSIO_KEY,
    },
    body: JSON.stringify({
      connectedAccountId: GMAIL_CONNECTION,
      input: {
        recipient_email: NOTIFICATION_EMAIL,
        subject,
        body,
      },
    }),
  })
  const data = await res.json()
  if (data.successfull || data.successful) {
    console.log('📧 Email sent successfully')
  } else {
    console.error('❌ Email failed:', JSON.stringify(data).slice(0, 200))
  }
}

async function loadKnownParcels(): Promise<Set<string>> {
  const fs = require('fs')
  const path = require('path')
  const file = path.join(__dirname, '..', 'data', 'known-parcels.json')
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return new Set(data)
  } catch {
    return new Set()
  }
}

async function saveKnownParcels(ids: Set<string>): Promise<void> {
  const fs = require('fs')
  const path = require('path')
  const dir = path.join(__dirname, '..', 'data')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'known-parcels.json'), JSON.stringify([...ids]))
}

async function main() {
  console.log(`🔍 LotScout Agent — ${new Date().toISOString()}`)

  // 1. Query DeKalb
  const parcels = await queryDeKalb()
  console.log(`📦 Raw parcels: ${parcels.length}`)

  // 2. Filter: residential zoning, skip government/HOA owners
  const filtered = parcels
    .filter(p => isResidentialZoning(p.ZONING))
    .filter(p => !isSkippedOwner(p.OWNERNME1))

  console.log(`🏠 After filters: ${filtered.length}`)

  // 3. Score
  const scored: ScoredLead[] = filtered
    .map(p => ({ ...p, score: scoreLot(p), absentee: isAbsentee(p) }))
    .sort((a, b) => b.score - a.score)

  const hotLeads = scored.filter(l => l.score >= 50)
  console.log(`🔥 Hot leads (≥50): ${hotLeads.length}`)

  // 4. Check for NEW leads
  const known = await loadKnownParcels()
  const newLeads = hotLeads.filter(l => !known.has(l.PARCELID.trim()))
  console.log(`🆕 New leads: ${newLeads.length}`)

  // 5. Update known parcels
  for (const l of hotLeads) known.add(l.PARCELID.trim())
  await saveKnownParcels(known)

  // 6. Save full leads file
  const fs = require('fs')
  const path = require('path')
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'dekalb-leads.json'),
    JSON.stringify(scored.slice(0, 200).map(p => ({
      parcelId: p.PARCELID.trim(),
      ownerName: p.OWNERNME1,
      ownerMailAddress: p.PSTLADDRESS,
      ownerMailCity: p.PSTLCITY,
      ownerMailState: p.PSTLSTATE,
      ownerMailZip: p.PSTLZIP5,
      propertyAddress: p.SITEADDRESS,
      propertyCity: p.CITY || 'Decatur',
      propertyState: 'GA',
      propertyZip: p.ZIP,
      county: 'DeKalb',
      zoning: p.ZONING,
      lotSizeAcres: p.ACREAGE,
      lotSizeSqft: Math.round(p.ACREAGE * 43560),
      propertyClass: p.CLASSDSCRP,
      taxAssessedValue: p.CNTASSDVAL,
      isAbsenteeOwner: p.absentee,
      leadScore: p.score,
    })), null, 2)
  )

  if (newLeads.length === 0) {
    console.log('✅ No new leads today — skipping email')
    return
  }

  // 7. Ask MiniMax to analyze top new leads
  const top15 = newLeads.slice(0, 15)
  const leadSummary = top15.map((l, i) =>
    `${i + 1}. ${l.SITEADDRESS} ${l.ZIP} — Score: ${l.score}, ${l.ACREAGE}ac, ${l.ZONING}, $${l.CNTASSDVAL.toLocaleString()} assessed, Owner: ${l.OWNERNME1}${l.absentee ? ' (ABSENTEE from ' + l.PSTLCITY + ')' : ''}`
  ).join('\n')

  const analysis = await askMiniMax(
    `Analyze these ${top15.length} new vacant infill lot leads in the Atlanta metro (DeKalb County). ` +
    `Our buy box: 0.10-0.35 acres, residential zoning (R-75, MR-2, R-100), under $100K assessed value. ` +
    `We wholesale to builders — build cost $165/sqft, 1600sqft build, 20% builder margin, $10K wholesale fee.\n\n` +
    `New leads:\n${leadSummary}\n\n` +
    `For the top 5, give: (1) quick take on the opportunity, (2) estimated max offer range based on likely ARV for the area, (3) any red flags. Keep it brief and actionable.`
  )

  console.log('\n🤖 MiniMax Analysis:\n', analysis)

  // 8. Build email
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const emailBody = `
LotScout Daily Report — ${today}

${newLeads.length} NEW LOTS found matching your buy box in DeKalb County.
Total hot leads in database: ${hotLeads.length}

═══ TOP ${top15.length} NEW LEADS ═══

${top15.map((l, i) => `
${i + 1}. ${l.SITEADDRESS}, ${l.ZIP}
   Score: ${l.score}/100 | ${l.ACREAGE} acres | ${l.ZONING} zoning
   Assessed: $${l.CNTASSDVAL.toLocaleString()} | Owner: ${l.OWNERNME1}
   ${l.absentee ? '⚡ ABSENTEE — mailing to ' + l.PSTLCITY + ', ' + l.PSTLSTATE + ' ' + l.PSTLZIP5 : 'Local owner'}
   Parcel: ${l.PARCELID.trim()}
`).join('')}

═══ AI ANALYSIS ═══

${analysis}

═══ STATS ═══
• Total parcels scanned: ${parcels.length}
• After filters (residential, no gov): ${filtered.length}
• Hot leads (score ≥ 50): ${hotLeads.length}
• New since last scan: ${newLeads.length}

View lots: https://lotscout.vercel.app

— LotScout Agent
`.trim()

  await sendEmail(`🔍 LotScout: ${newLeads.length} New Lots Found — ${today}`, emailBody)

  console.log(`\n✅ Done. ${newLeads.length} new leads emailed.`)
}

main().catch(console.error)
