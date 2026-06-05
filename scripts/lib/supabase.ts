/**
 * Supabase REST helpers for the scanner (insert + dedupe).
 * Credentials come from .env via requireEnv — never hardcoded.
 */
import { requireEnv } from './env'
import { NormalizedLot } from './types'

function base() {
  const url = requireEnv('SUPABASE_URL').replace(/\/$/, '')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  }
}

/** All parcel_ids already stored for a county, to skip re-inserting. */
export async function getExistingParcelIds(county: string): Promise<Set<string>> {
  const { url, headers } = base()
  const ids = new Set<string>()
  let offset = 0
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/lots?select=parcel_id&county=eq.${encodeURIComponent(county)}&offset=${offset}&limit=1000`,
      { headers },
    )
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    for (const row of data) ids.add(String(row.parcel_id).trim())
    offset += data.length
    if (data.length < 1000) break
  }
  return ids
}

function toDbRow(lot: NormalizedLot) {
  return {
    parcel_id: lot.parcelId.trim(),
    owner_name: lot.ownerName,
    owner_mail_address: lot.ownerMailAddress,
    owner_mail_city: lot.ownerMailCity,
    owner_mail_state: lot.ownerMailState,
    owner_mail_zip: lot.ownerMailZip,
    property_address: lot.propertyAddress,
    property_city: lot.propertyCity,
    property_state: lot.propertyState,
    property_zip: lot.propertyZip,
    county: lot.county,
    zoning: lot.zoning,
    lot_size_acres: lot.lotSizeAcres,
    lot_size_sqft: lot.lotSizeAcres != null ? Math.round(lot.lotSizeAcres * 43560) : null,
    property_class: lot.propertyClass,
    tax_assessed_value: lot.taxAssessedValue,
    is_absentee_owner: !!lot.isAbsenteeOwner,
    lead_score: lot.leadScore ?? 0,
    lead_status: 'new',
    neighborhood: lot.neighborhood,
  }
}

/** Insert lots in batches of 100, ignoring duplicate parcel_ids. */
export async function insertLots(lots: NormalizedLot[]): Promise<number> {
  if (lots.length === 0) return 0
  const { url, headers } = base()
  let inserted = 0
  for (let i = 0; i < lots.length; i += 100) {
    const batch = lots.slice(i, i + 100).map(toDbRow)
    const res = await fetch(`${url}/rest/v1/lots`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(batch),
    })
    if (res.ok) inserted += batch.length
    else console.error(`  ⚠️ insert batch failed: ${(await res.text()).slice(0, 200)}`)
  }
  return inserted
}
