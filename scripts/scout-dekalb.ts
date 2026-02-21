/**
 * LotScout - DeKalb County Vacant Land Scanner
 * 
 * Queries DeKalb County ArcGIS MapServer for parcels matching buy box criteria,
 * scores them, and outputs qualified leads.
 * 
 * Data source: https://dcgis.dekalbcountyga.gov/mapping/rest/services/TaxParcels/MapServer/0
 */

const DEKALB_API = 'https://dcgis.dekalbcountyga.gov/mapping/rest/services/TaxParcels/MapServer/0/query'

// Buy box defaults from seed.ts
const BUY_BOX = {
  targetZips: ['30032', '30033', '30079'],
  minAcres: 0.10,
  maxAcres: 0.35,
  maxTaxValue: 100_000,
  // Residential zonings only — exclude C-1, OI, I-*, etc
  allowedZoningPrefixes: ['R-', 'MR-'],
  // Low assessed value signals vacant land (no structure)
  vacantValueThreshold: 60_000,
}

// Neighborhood zip scores (from seed)
const NEIGHBORHOOD_SCORES: Record<string, number> = {
  '30079': 10,
  '30032': 9,
  '30033': 11,
}

interface DeKalbParcel {
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

function isAbsentee(parcel: DeKalbParcel): boolean {
  if (!parcel.ZIP || !parcel.PSTLZIP5) return false
  return parcel.ZIP !== parcel.PSTLZIP5
}

function isResidentialZoning(zoning: string): boolean {
  if (!zoning) return false
  const z = zoning.toUpperCase()
  return BUY_BOX.allowedZoningPrefixes.some(p => z.startsWith(p))
}

function scoreLot(parcel: DeKalbParcel): number {
  let score = 0
  const z = (parcel.ZONING || '').toUpperCase()

  // Zoning (25 pts)
  if (z.includes('R-5') || z.includes('MR-2')) score += 25
  else if (z.includes('R-4') || z.includes('R-100')) score += 22
  else if (z.includes('R-3') || z.includes('R-85')) score += 18
  else if (z.includes('R-2') || z.includes('R-75')) score += 12
  else if (z.includes('R-1') || z.includes('R-60')) score += 8

  // Lot size sweet spot (20 pts)
  const acres = parcel.ACREAGE
  if (acres >= 0.14 && acres <= 0.22) score += 20
  else if (acres >= 0.12 && acres <= 0.25) score += 15
  else if (acres >= 0.10 && acres <= 0.30) score += 10
  else if (acres >= 0.08 && acres <= 0.35) score += 5

  // Absentee (15 pts)
  if (isAbsentee(parcel)) score += 15

  // Low/zero assessed value = likely vacant (15 pts)
  if (parcel.CNTASSDVAL === 0) score += 15
  else if (parcel.CNTASSDVAL < 10000) score += 12
  else if (parcel.CNTASSDVAL < 25000) score += 8
  else if (parcel.CNTASSDVAL < 50000) score += 5

  // Neighborhood (15 pts)
  const zipScore = NEIGHBORHOOD_SCORES[parcel.ZIP] || 0
  score += Math.min(zipScore, 15)

  // Address hints for vacant (10 pts)
  const addr = (parcel.SITEADDRESS || '').toUpperCase()
  if (addr.startsWith('0 ') || addr.includes('REAR') || addr.includes('LOT')) score += 10

  return Math.min(score, 100)
}

async function queryDeKalb(offset = 0, limit = 2000): Promise<DeKalbParcel[]> {
  const zips = BUY_BOX.targetZips.map(z => `'${z}'`).join(',')
  const where = [
    `ZIP IN (${zips})`,
    `ACREAGE >= ${BUY_BOX.minAcres}`,
    `ACREAGE <= ${BUY_BOX.maxAcres}`,
    `CNTASSDVAL < ${BUY_BOX.maxTaxValue}`,
  ].join(' AND ')

  const params = new URLSearchParams({
    where,
    outFields: 'PARCELID,OWNERNME1,OWNERNME2,SITEADDRESS,CITY,ZIP,ZONING,ACREAGE,CNTASSDVAL,CLASSDSCRP,LANDUSE,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5',
    f: 'json',
    resultRecordCount: String(limit),
    resultOffset: String(offset),
    returnGeometry: 'false',
    orderByFields: 'CNTASSDVAL ASC',
  })

  const res = await fetch(`${DEKALB_API}?${params}`)
  const data = await res.json()
  return (data.features || []).map((f: any) => f.attributes as DeKalbParcel)
}

async function main() {
  console.log('🔍 LotScout — DeKalb County Scanner')
  console.log(`Target zips: ${BUY_BOX.targetZips.join(', ')}`)
  console.log(`Size range: ${BUY_BOX.minAcres}–${BUY_BOX.maxAcres} acres`)
  console.log(`Max assessed value: $${BUY_BOX.maxTaxValue.toLocaleString()}`)
  console.log()

  // Paginate through all results
  let allParcels: DeKalbParcel[] = []
  let offset = 0
  const pageSize = 2000

  while (true) {
    const batch = await queryDeKalb(offset, pageSize)
    if (batch.length === 0) break
    allParcels.push(...batch)
    offset += batch.length
    if (batch.length < pageSize) break
  }

  console.log(`📦 Total parcels matching basic criteria: ${allParcels.length}`)

  // Filter to residential zoning only
  const residential = allParcels.filter(p => isResidentialZoning(p.ZONING))
  console.log(`🏠 Residential zoning: ${residential.length}`)

  // Score and rank
  const scored = residential.map(p => ({
    ...p,
    score: scoreLot(p),
    absentee: isAbsentee(p),
  })).sort((a, b) => b.score - a.score)

  // Top leads (score >= 50)
  const hotLeads = scored.filter(l => l.score >= 50)
  const warmLeads = scored.filter(l => l.score >= 30 && l.score < 50)

  console.log(`\n🔥 HOT LEADS (score ≥ 50): ${hotLeads.length}`)
  console.log(`🟡 WARM LEADS (score 30-49): ${warmLeads.length}`)
  console.log(`❄️  COLD (score < 30): ${scored.length - hotLeads.length - warmLeads.length}`)

  // Print top 25
  console.log('\n═══ TOP 25 LEADS ═══')
  for (const lot of scored.slice(0, 25)) {
    console.log(`\n  Score: ${lot.score} | ${lot.SITEADDRESS} ${lot.ZIP}`)
    console.log(`    Owner: ${lot.OWNERNME1}${lot.absentee ? ' (ABSENTEE → ' + lot.PSTLCITY + ' ' + lot.PSTLZIP5 + ')' : ''}`)
    console.log(`    Zone: ${lot.ZONING} | ${lot.ACREAGE} acres | Assessed: $${lot.CNTASSDVAL.toLocaleString()}`)
    console.log(`    Parcel: ${lot.PARCELID} | Class: ${lot.CLASSDSCRP} | Use: ${lot.LANDUSE}`)
  }

  // Output as JSON for import
  const output = scored.slice(0, 100).map(p => ({
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
    neighborhood: p.LANDUSE,
  }))

  // Write to file
  const fs = require('fs')
  fs.writeFileSync('data/dekalb-leads.json', JSON.stringify(output, null, 2))
  console.log(`\n✅ Wrote ${output.length} leads to data/dekalb-leads.json`)
}

main().catch(console.error)
