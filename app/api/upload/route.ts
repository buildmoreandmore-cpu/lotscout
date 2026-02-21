import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLeadScore } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rows } = body // Array of parsed CSV/XLSX rows

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const neighborhoodScores = settings ? JSON.parse(settings.neighborhoodScores) : {}

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const parcelId = row.parcelId || row['Parcel ID'] || row['parcel_id'] || row['PARCEL_ID'] || row['ParcelID']
      if (!parcelId) { skipped++; continue }

      const existing = await prisma.lot.findUnique({ where: { parcelId: String(parcelId) } })
      if (existing) { skipped++; continue }

      const ownerName = row.ownerName || row['Owner Name'] || row['owner_name'] || row['OWNER_NAME'] || ''
      const propertyAddress = row.propertyAddress || row['Property Address'] || row['property_address'] || row['PROPERTY_ADDRESS'] || row['Site Address'] || ''
      const propertyZip = row.propertyZip || row['ZIP'] || row['Zip'] || row['zip'] || row['Property Zip'] || row['property_zip'] || ''
      const county = row.county || row['County'] || row['COUNTY'] || ''
      const zoning = row.zoning || row['Zoning'] || row['ZONING'] || row['Zone'] || null
      const ownerMailAddress = row.ownerMailAddress || row['Owner Mail Address'] || row['Mailing Address'] || row['mailing_address'] || null
      const ownerMailCity = row.ownerMailCity || row['Mail City'] || null
      const ownerMailState = row.ownerMailState || row['Mail State'] || null
      const ownerMailZip = row.ownerMailZip || row['Mail Zip'] || null

      const rawAcres = row.lotSizeAcres || row['Lot Size Acres'] || row['Acres'] || row['acres'] || row['LOT_SIZE'] || null
      const rawSqft = row.lotSizeSqft || row['Lot Size Sqft'] || row['Sqft'] || row['sqft'] || row['LOT_SQFT'] || null
      const lotSizeAcres = rawAcres ? parseFloat(String(rawAcres)) : (rawSqft ? parseFloat(String(rawSqft)) / 43560 : null)
      const lotSizeSqft = rawSqft ? parseFloat(String(rawSqft)) : (rawAcres ? parseFloat(String(rawAcres)) * 43560 : null)

      const rawTaxValue = row.taxAssessedValue || row['Tax Assessed Value'] || row['Assessed Value'] || row['assessed_value'] || null
      const taxAssessedValue = rawTaxValue ? parseFloat(String(rawTaxValue).replace(/[,$]/g, '')) : null

      const taxStatus = row.taxStatus || row['Tax Status'] || row['tax_status'] || 'current'
      const rawDelinquent = row.taxDelinquentYrs || row['Years Delinquent'] || row['delinquent_years'] || '0'
      const taxDelinquentYrs = parseInt(String(rawDelinquent)) || 0

      const rawLastSaleDate = row.lastSaleDate || row['Last Sale Date'] || row['sale_date'] || null
      const lastSaleDate = rawLastSaleDate ? new Date(rawLastSaleDate) : null
      const rawLastSalePrice = row.lastSalePrice || row['Last Sale Price'] || row['sale_price'] || null
      const lastSalePrice = rawLastSalePrice ? parseFloat(String(rawLastSalePrice).replace(/[,$]/g, '')) : null

      const rawYearBuilt = row.yearBuilt || row['Year Built'] || row['year_built'] || null
      const yearBuilt = rawYearBuilt ? parseInt(String(rawYearBuilt)) : null

      const propertyClass = row.propertyClass || row['Property Class'] || row['property_class'] || row['Land Use'] || null
      const neighborhood = row.neighborhood || row['Neighborhood'] || row['Subdivision'] || row['neighborhood'] || null

      const isAbsenteeOwner = !!(ownerMailAddress && propertyAddress &&
        ownerMailAddress.toLowerCase().trim() !== propertyAddress.toLowerCase().trim())

      const score = calculateLeadScore({
        zoning, lotSizeAcres, isAbsenteeOwner, taxDelinquentYrs,
        lastSaleDate, propertyZip: String(propertyZip), neighborhood,
      }, { neighborhoodScores })

      await prisma.lot.create({
        data: {
          parcelId: String(parcelId), ownerName: String(ownerName), ownerMailAddress, ownerMailCity, ownerMailState, ownerMailZip,
          propertyAddress: String(propertyAddress), propertyCity: row.propertyCity || null, propertyZip: String(propertyZip),
          county: String(county), zoning, lotSizeAcres, lotSizeSqft, propertyClass, taxAssessedValue,
          taxStatus: String(taxStatus).toLowerCase().includes('delinq') ? 'delinquent' : 'current',
          taxDelinquentYrs, lastSaleDate, lastSalePrice, yearBuilt, neighborhood,
          isAbsenteeOwner, leadScore: score,
        },
      })
      imported++
    } catch (e: any) {
      errors.push(e.message)
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10), total: rows.length })
}
