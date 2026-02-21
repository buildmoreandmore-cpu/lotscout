import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rows } = body

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const parcelId = row.parcelId || row['Parcel ID'] || row['parcel_id'] || row['PARCEL_ID'] || row['ParcelID']
      if (!parcelId) { skipped++; continue }

      const ownerName = row.ownerName || row['Owner Name'] || row['owner_name'] || ''
      const propertyAddress = row.propertyAddress || row['Property Address'] || row['property_address'] || row['Site Address'] || ''
      const propertyZip = row.propertyZip || row['ZIP'] || row['Zip'] || row['zip'] || ''
      const county = row.county || row['County'] || row['COUNTY'] || ''
      const zoning = row.zoning || row['Zoning'] || row['ZONING'] || null
      const ownerMailAddress = row.ownerMailAddress || row['Owner Mail Address'] || row['Mailing Address'] || null
      const ownerMailCity = row.ownerMailCity || row['Mail City'] || null
      const ownerMailState = row.ownerMailState || row['Mail State'] || null
      const ownerMailZip = row.ownerMailZip || row['Mail Zip'] || null

      const rawAcres = row.lotSizeAcres || row['Lot Size Acres'] || row['Acres'] || null
      const rawSqft = row.lotSizeSqft || row['Lot Size Sqft'] || row['Sqft'] || null
      const lot_size_acres = rawAcres ? parseFloat(String(rawAcres)) : (rawSqft ? parseFloat(String(rawSqft)) / 43560 : null)
      const lot_size_sqft = rawSqft ? parseFloat(String(rawSqft)) : (rawAcres ? parseFloat(String(rawAcres)) * 43560 : null)

      const rawTaxValue = row.taxAssessedValue || row['Tax Assessed Value'] || row['Assessed Value'] || null
      const tax_assessed_value = rawTaxValue ? parseFloat(String(rawTaxValue).replace(/[,$]/g, '')) : null

      const rawDelinquent = row.taxDelinquentYrs || row['Years Delinquent'] || '0'
      const tax_delinquent_yrs = parseInt(String(rawDelinquent)) || 0

      const is_absentee_owner = !!(ownerMailAddress && propertyAddress &&
        ownerMailAddress.toLowerCase().trim() !== propertyAddress.toLowerCase().trim())

      const { error } = await supabase.from('lots').upsert({
        parcel_id: String(parcelId),
        owner_name: String(ownerName),
        owner_mail_address: ownerMailAddress,
        owner_mail_city: ownerMailCity,
        owner_mail_state: ownerMailState,
        owner_mail_zip: ownerMailZip,
        property_address: String(propertyAddress),
        property_city: row.propertyCity || null,
        property_zip: String(propertyZip),
        county: String(county),
        zoning,
        lot_size_acres,
        lot_size_sqft,
        property_class: row.propertyClass || row['Property Class'] || null,
        tax_assessed_value,
        tax_delinquent_yrs,
        is_absentee_owner,
        neighborhood: row.neighborhood || row['Neighborhood'] || null,
      }, { onConflict: 'parcel_id', ignoreDuplicates: true })

      if (error) { errors.push(error.message); skipped++ }
      else imported++
    } catch (e: any) {
      errors.push(e.message)
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10), total: rows.length })
}
