import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── 5 SAMPLE lots covering a range of scores, zones, counties, and owner types ──
const sampleLots = [
  // High-score: absentee + tax delinquent + R5 zoning + sweet-spot size
  {
    parcelId: 'SAMPLE-001', ownerName: '[Sample] James T. Robinson',
    ownerMailAddress: '4521 Roswell Rd NE', ownerMailCity: 'Sandy Springs', ownerMailState: 'GA', ownerMailZip: '30342',
    propertyAddress: '882 Dill Ave SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton',
    zoning: 'R5', lotSizeAcres: 0.18, lotSizeSqft: 7841, propertyClass: 'Vacant',
    taxAssessedValue: 28000, taxStatus: 'delinquent', taxDelinquentYrs: 3,
    lastSaleDate: new Date('2005-03-15'), lastSalePrice: 12000,
    neighborhood: 'West End', isAbsenteeOwner: true,
    latitude: 33.7350, longitude: -84.4180,
  },
  // Mid-score: local owner, current taxes, R4, good size
  {
    parcelId: 'SAMPLE-002', ownerName: '[Sample] Patricia A. Washington',
    ownerMailAddress: '882 Metropolitan Pkwy', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30310',
    propertyAddress: '882 Metropolitan Pkwy SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton',
    zoning: 'R4', lotSizeAcres: 0.15, lotSizeSqft: 6534, propertyClass: 'Vacant',
    taxAssessedValue: 22000, taxStatus: 'current', taxDelinquentYrs: 0,
    lastSaleDate: new Date('2008-08-22'), lastSalePrice: 8500,
    neighborhood: 'Pittsburgh', isAbsenteeOwner: false,
    latitude: 33.7280, longitude: -84.4050,
  },
  // Mid-score: absentee, R3, DeKalb County, 1yr delinquent
  {
    parcelId: 'SAMPLE-003', ownerName: '[Sample] Sharon M. Thomas',
    ownerMailAddress: '900 DeKalb Ave NE', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30307',
    propertyAddress: '3355 Covington Hwy', propertyCity: 'Scottdale', propertyZip: '30032', county: 'DeKalb',
    zoning: 'R3', lotSizeAcres: 0.20, lotSizeSqft: 8712, propertyClass: 'Vacant',
    taxAssessedValue: 21000, taxStatus: 'delinquent', taxDelinquentYrs: 1,
    lastSaleDate: new Date('2013-07-18'), lastSalePrice: 15000,
    neighborhood: 'Scottdale', isAbsenteeOwner: true,
    latitude: 33.7700, longitude: -84.2600,
  },
  // Lower-score: local owner, R2, smaller lot, current taxes
  {
    parcelId: 'SAMPLE-004', ownerName: '[Sample] Henry B. Wright Jr',
    ownerMailAddress: '500 Whitehall St SW', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30314',
    propertyAddress: '500 Whitehall St SW', propertyCity: 'Atlanta', propertyZip: '30314', county: 'Fulton',
    zoning: 'R2', lotSizeAcres: 0.12, lotSizeSqft: 5227, propertyClass: 'Vacant',
    taxAssessedValue: 15000, taxStatus: 'current', taxDelinquentYrs: 0,
    lastSaleDate: new Date('2018-01-15'), lastSalePrice: 7500,
    neighborhood: 'Mechanicsville', isAbsenteeOwner: false,
    latitude: 33.7440, longitude: -84.3980,
  },
  // High-score: absentee, R4, East Atlanta, larger lot
  {
    parcelId: 'SAMPLE-005', ownerName: '[Sample] Diane F. Martin',
    ownerMailAddress: '4400 Ashford Dunwoody Rd', ownerMailCity: 'Dunwoody', ownerMailState: 'GA', ownerMailZip: '30346',
    propertyAddress: '890 Woodland Ave SE', propertyCity: 'Atlanta', propertyZip: '30316', county: 'Fulton',
    zoning: 'R4', lotSizeAcres: 0.19, lotSizeSqft: 8276, propertyClass: 'Vacant',
    taxAssessedValue: 42000, taxStatus: 'current', taxDelinquentYrs: 0,
    lastSaleDate: new Date('2010-05-20'), lastSalePrice: 32000,
    neighborhood: 'East Atlanta', isAbsenteeOwner: true,
    latitude: 33.7350, longitude: -84.3450,
  },
]

async function main() {
  console.log('Seeding database with sample data...')

  // ── Settings ──
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      defaultBuildCost: 165,
      defaultBuildSqft: 1600,
      defaultWholesaleFee: 10000,
      defaultBuilderMargin: 0.20,
      arvMultiplier: 0.80,
      darkMode: true,
      neighborhoodScores: JSON.stringify({
        '30310': 14, '30311': 12, '30312': 13, '30314': 10,
        '30315': 8, '30316': 13, '30317': 12, '30318': 11,
        '30079': 10, '30032': 9, '30033': 11, '30002': 8,
      }),
    },
  })

  // ── Buy boxes ──
  await prisma.buyBox.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'ATL Infill Default',
      zonings: JSON.stringify(['R1', 'R2', 'R3', 'R4', 'R5']),
      minLotSizeAcres: 0.10, maxLotSizeAcres: 0.35,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30310', '30311', '30312', '30314', '30315', '30316', '30317', '30318', '30079', '30032', '30033', '30002']),
      maxTaxValue: 100000, absenteeOnly: false,
      excludeZonings: JSON.stringify(['C1', 'C2', 'I1', 'I2', 'O-I']),
      minLotSizeSqft: 4000, maxLotSizeSqft: 43560, isDefault: true,
    },
  })

  await prisma.buyBox.upsert({
    where: { id: 'westend' },
    update: {},
    create: {
      id: 'westend', name: 'West End Lots',
      zonings: JSON.stringify(['R4', 'R5']),
      minLotSizeAcres: 0.12, maxLotSizeAcres: 0.25,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30310', '30311', '30314']),
      maxTaxValue: 50000, absenteeOnly: false, minLotSizeSqft: 5000, isDefault: false,
    },
  })

  await prisma.buyBox.upsert({
    where: { id: 'eastatlanta' },
    update: {},
    create: {
      id: 'eastatlanta', name: 'East Atlanta',
      zonings: JSON.stringify(['R3', 'R4', 'R5']),
      minLotSizeAcres: 0.14, maxLotSizeAcres: 0.25,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30316', '30317', '30312']),
      maxTaxValue: 80000, absenteeOnly: false, minLotSizeSqft: 5500, isDefault: false,
    },
  })

  // ── Sample lots ──
  const { calculateLeadScore } = await import('../lib/scoring')
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const neighborhoodScores = settings ? JSON.parse(settings.neighborhoodScores) : {}

  for (const lot of sampleLots) {
    const score = calculateLeadScore({
      zoning: lot.zoning,
      lotSizeAcres: lot.lotSizeAcres,
      isAbsenteeOwner: lot.isAbsenteeOwner,
      taxDelinquentYrs: lot.taxDelinquentYrs,
      lastSaleDate: lot.lastSaleDate,
      propertyZip: lot.propertyZip,
      neighborhood: lot.neighborhood,
    }, { neighborhoodScores })

    await prisma.lot.upsert({
      where: { parcelId: lot.parcelId },
      update: {},
      create: { ...lot, leadScore: score, isSample: true },
    })
  }

  console.log(`Seeded ${sampleLots.length} sample lots, 3 buy boxes, and default settings.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
