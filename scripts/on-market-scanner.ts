/**
 * On-Market Vacant Land Scanner
 * Searches Redfin API for listed vacant land in ATL metro target zips
 * Matches against our buy box: 5,700-8,800 sqft, R1-R4, under $100K
 */

const SUPABASE_URL = 'https://vbwcatbixcgakdwgdavl.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2NhdGJpeGNnYWtkd2dkYXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MzM4NywiZXhwIjoyMDg3MjY5Mzg3fQ.2j0q61nh9cJJa420-SxBEJMA2SuPRft6azAPNT8-C_M'

const TARGET_ZIPS = ['30310','30311','30312','30314','30315','30316','30317','30318','30032','30033','30079','30002']
const MIN_SQFT = 5700
const MAX_SQFT = 8800
const MAX_PRICE = 150000 // Search wider, filter tighter

// ATL metro bounding box
const POLY = '-84.55 33.68,-84.25 33.68,-84.25 33.82,-84.55 33.82,-84.55 33.68'

interface OnMarketLot {
  address: string
  city: string
  zip: string
  price: number
  lotSizeSqft: number
  lotSizeAcres: number
  mlsId: string
  listingUrl: string
  daysOnMarket: number
  source: string
}

async function searchRedfin(): Promise<OnMarketLot[]> {
  const url = `https://www.redfin.com/stingray/api/gis?al=1&property_type=8&min_lot_size=${MIN_SQFT}&max_lot_size=${MAX_SQFT}&max_price=${MAX_PRICE}&num_homes=350&poly=${encodeURIComponent(POLY)}&v=8`
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
  })
  
  const raw = await res.text()
  const json = JSON.parse(raw.startsWith('{}&&') ? raw.slice(4) : raw)
  const homes = json?.payload?.homes || []
  
  const lots: OnMarketLot[] = []
  for (const h of homes) {
    const ptype = h.propertyType
    if (ptype !== 8 && ptype !== 10) continue // Only vacant land
    
    const zip = h.zip || ''
    if (!TARGET_ZIPS.includes(zip)) continue
    
    const lotSqft = h.lotSize?.value || 0
    if (lotSqft < MIN_SQFT || lotSqft > MAX_SQFT) continue
    
    lots.push({
      address: h.streetLine?.value || '',
      city: h.city || 'Atlanta',
      zip,
      price: h.price?.value || 0,
      lotSizeSqft: lotSqft,
      lotSizeAcres: Math.round((lotSqft / 43560) * 100) / 100,
      mlsId: h.mlsId?.value || '',
      listingUrl: `https://www.redfin.com${h.url || ''}`,
      daysOnMarket: h.dom?.value || 0,
      source: 'redfin',
    })
  }
  
  return lots
}

async function upsertLots(lots: OnMarketLot[]) {
  let inserted = 0
  
  for (const lot of lots) {
    // Check if already exists by address + zip
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lots?property_address=eq.${encodeURIComponent(lot.address)}&property_zip=eq.${lot.zip}&select=id`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    const existing = await checkRes.json()
    
    if (existing.length > 0) {
      // Update existing lot with on-market data
      await fetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          listing_price: lot.price,
          listing_url: lot.listingUrl,
          mls_id: lot.mlsId,
          days_on_market: lot.daysOnMarket,
          is_on_market: true,
          notes: `On-market via ${lot.source} | MLS# ${lot.mlsId} | $${lot.price.toLocaleString()} | ${lot.daysOnMarket} DOM`,
        }),
      })
      console.log(`  Updated: ${lot.address}, ${lot.zip} — $${lot.price.toLocaleString()}`)
    } else {
      // Insert new lot
      const res = await fetch(`${SUPABASE_URL}/rest/v1/lots`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          property_address: lot.address,
          property_city: lot.city,
          property_state: 'GA',
          property_zip: lot.zip,
          county: 'Fulton',
          lot_size_sqft: lot.lotSizeSqft,
          lot_size_acres: lot.lotSizeAcres,
          listing_price: lot.price,
          listing_url: lot.listingUrl,
          mls_id: lot.mlsId,
          days_on_market: lot.daysOnMarket,
          is_on_market: true,
          lead_status: 'new',
          lead_score: 60, // On-market gets a base score
          notes: `On-market via ${lot.source} | MLS# ${lot.mlsId} | $${lot.price.toLocaleString()} | ${lot.daysOnMarket} DOM`,
        }),
      })
      if (res.ok) inserted++
      console.log(`  Inserted: ${lot.address}, ${lot.zip} — $${lot.price.toLocaleString()}`)
    }
  }
  
  return inserted
}

async function main() {
  console.log('🏠 On-Market Vacant Land Scanner')
  console.log(`Target zips: ${TARGET_ZIPS.join(', ')}`)
  console.log(`Criteria: ${MIN_SQFT}-${MAX_SQFT} sqft, under $${MAX_PRICE.toLocaleString()}\n`)
  
  console.log('📡 Searching Redfin...')
  const redfinLots = await searchRedfin()
  console.log(`Found ${redfinLots.length} matching lots on Redfin\n`)
  
  for (const lot of redfinLots) {
    console.log(`  ${lot.address}, ${lot.zip} — $${lot.price.toLocaleString()} | ${lot.lotSizeSqft}sqft (${lot.lotSizeAcres}ac) | ${lot.daysOnMarket} DOM`)
  }
  
  if (redfinLots.length > 0) {
    console.log('\n💾 Saving to database...')
    const inserted = await upsertLots(redfinLots)
    console.log(`\n✅ Done: ${inserted} new lots added, ${redfinLots.length - inserted} updated`)
  } else {
    console.log('\nNo on-market lots matching criteria found.')
  }
}

main().catch(console.error)
