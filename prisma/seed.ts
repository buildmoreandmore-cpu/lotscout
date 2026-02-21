import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleLots = [
  { parcelId: 'FUL-14-0100-001', ownerName: 'James T. Robinson', ownerMailAddress: '4521 Roswell Rd NE', ownerMailCity: 'Sandy Springs', ownerMailState: 'GA', ownerMailZip: '30342', propertyAddress: '882 Dill Ave SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.18, lotSizeSqft: 7841, propertyClass: 'Vacant', taxAssessedValue: 28000, taxStatus: 'delinquent', taxDelinquentYrs: 2, lastSaleDate: new Date('2009-03-15'), lastSalePrice: 12000, neighborhood: 'West End', isAbsenteeOwner: true, latitude: 33.7350, longitude: -84.4180 },
  { parcelId: 'FUL-14-0100-002', ownerName: 'Patricia A. Washington', ownerMailAddress: '882 Metropolitan Pkwy', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30310', propertyAddress: '882 Metropolitan Pkwy', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.15, lotSizeSqft: 6534, propertyClass: 'Vacant', taxAssessedValue: 22000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2005-08-22'), lastSalePrice: 8500, neighborhood: 'Pittsburgh', isAbsenteeOwner: false, latitude: 33.7280, longitude: -84.4050 },
  { parcelId: 'FUL-14-0100-003', ownerName: 'Robert L. Harris Estate', ownerMailAddress: '1250 W Paces Ferry Rd', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30327', propertyAddress: '1045 White Oak Ave SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton', zoning: 'R5', lotSizeAcres: 0.21, lotSizeSqft: 9148, propertyClass: 'Vacant', taxAssessedValue: 35000, taxStatus: 'delinquent', taxDelinquentYrs: 3, lastSaleDate: new Date('2001-11-05'), lastSalePrice: 15000, neighborhood: 'Adair Park', isAbsenteeOwner: true, latitude: 33.7310, longitude: -84.4120 },
  { parcelId: 'FUL-14-0100-004', ownerName: 'Tamika S. Jackson', ownerMailAddress: '3300 Buckeye Rd', ownerMailCity: 'Decatur', ownerMailState: 'GA', ownerMailZip: '30032', propertyAddress: '458 Holderness St SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.16, lotSizeSqft: 6970, propertyClass: 'Unimproved', taxAssessedValue: 25000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2012-06-10'), lastSalePrice: 18000, neighborhood: 'West End', isAbsenteeOwner: true, latitude: 33.7340, longitude: -84.4200 },
  { parcelId: 'FUL-14-0100-005', ownerName: 'Marcus D. Williams', ownerMailAddress: '992 Murphy Ave SW', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30310', propertyAddress: '992 Murphy Ave SW', propertyCity: 'Atlanta', propertyZip: '30310', county: 'Fulton', zoning: 'R3', lotSizeAcres: 0.14, lotSizeSqft: 6098, propertyClass: 'Vacant', taxAssessedValue: 19500, taxStatus: 'delinquent', taxDelinquentYrs: 1, lastSaleDate: new Date('2015-02-28'), lastSalePrice: 22000, neighborhood: 'Capitol View', isAbsenteeOwner: false, latitude: 33.7220, longitude: -84.4150 },
  { parcelId: 'FUL-14-0200-001', ownerName: 'Dorothy M. Clark', ownerMailAddress: '750 Cascade Ave SW', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30311', propertyAddress: '750 Cascade Ave SW', propertyCity: 'Atlanta', propertyZip: '30311', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.22, lotSizeSqft: 9583, propertyClass: 'Vacant', taxAssessedValue: 32000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2003-09-12'), lastSalePrice: 11000, neighborhood: 'Cascade Heights', isAbsenteeOwner: false, latitude: 33.7190, longitude: -84.4350 },
  { parcelId: 'FUL-14-0200-002', ownerName: 'William A. Thompson', ownerMailAddress: '8820 Dunwoody Pl', ownerMailCity: 'Dunwoody', ownerMailState: 'GA', ownerMailZip: '30350', propertyAddress: '321 Lawton St SW', propertyCity: 'Atlanta', propertyZip: '30311', county: 'Fulton', zoning: 'R5', lotSizeAcres: 0.19, lotSizeSqft: 8276, propertyClass: 'Vacant', taxAssessedValue: 30000, taxStatus: 'delinquent', taxDelinquentYrs: 2, lastSaleDate: new Date('2007-04-18'), lastSalePrice: 14500, neighborhood: 'West End', isAbsenteeOwner: true, latitude: 33.7300, longitude: -84.4230 },
  { parcelId: 'FUL-14-0300-001', ownerName: 'Angela R. Davis', ownerMailAddress: '1500 Peachtree St NE', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30309', propertyAddress: '645 Glenwood Ave SE', propertyCity: 'Atlanta', propertyZip: '30312', county: 'Fulton', zoning: 'R3', lotSizeAcres: 0.17, lotSizeSqft: 7405, propertyClass: 'Vacant', taxAssessedValue: 45000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2016-11-30'), lastSalePrice: 38000, neighborhood: 'Grant Park', isAbsenteeOwner: true, latitude: 33.7400, longitude: -84.3720 },
  { parcelId: 'FUL-14-0300-002', ownerName: 'Gerald K. Moore', ownerMailAddress: '645 Memorial Dr SE', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30312', propertyAddress: '645 Memorial Dr SE', propertyCity: 'Atlanta', propertyZip: '30312', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.20, lotSizeSqft: 8712, propertyClass: 'Unimproved', taxAssessedValue: 52000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2018-03-22'), lastSalePrice: 45000, neighborhood: 'East Atlanta', isAbsenteeOwner: false, latitude: 33.7420, longitude: -84.3680 },
  { parcelId: 'FUL-14-0400-001', ownerName: 'Crystal L. Anderson', ownerMailAddress: '2200 Campbellton Rd', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30311', propertyAddress: '1185 Oakland Dr SW', propertyCity: 'Atlanta', propertyZip: '30314', county: 'Fulton', zoning: 'R3', lotSizeAcres: 0.13, lotSizeSqft: 5663, propertyClass: 'Vacant', taxAssessedValue: 18000, taxStatus: 'delinquent', taxDelinquentYrs: 1, lastSaleDate: new Date('2010-07-09'), lastSalePrice: 9000, neighborhood: 'Vine City', isAbsenteeOwner: true, latitude: 33.7560, longitude: -84.4180 },
  { parcelId: 'FUL-14-0400-002', ownerName: 'Henry B. Wright Jr', ownerMailAddress: '500 Whitehall St SW', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30314', propertyAddress: '500 Whitehall St SW', propertyCity: 'Atlanta', propertyZip: '30314', county: 'Fulton', zoning: 'R2', lotSizeAcres: 0.12, lotSizeSqft: 5227, propertyClass: 'Vacant', taxAssessedValue: 15000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2008-01-15'), lastSalePrice: 7500, neighborhood: 'Mechanicsville', isAbsenteeOwner: false, latitude: 33.7440, longitude: -84.3980 },
  { parcelId: 'FUL-14-0500-001', ownerName: 'Diane F. Martin', ownerMailAddress: '4400 Ashford Dunwoody', ownerMailCity: 'Dunwoody', ownerMailState: 'GA', ownerMailZip: '30346', propertyAddress: '890 Woodland Ave SE', propertyCity: 'Atlanta', propertyZip: '30316', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.19, lotSizeSqft: 8276, propertyClass: 'Vacant', taxAssessedValue: 42000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2014-05-20'), lastSalePrice: 32000, neighborhood: 'East Atlanta', isAbsenteeOwner: true, latitude: 33.7350, longitude: -84.3450 },
  { parcelId: 'FUL-14-0500-002', ownerName: 'Steven R. Taylor', ownerMailAddress: '890 Flat Shoals Ave', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30316', propertyAddress: '890 Flat Shoals Ave SE', propertyCity: 'Atlanta', propertyZip: '30316', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.16, lotSizeSqft: 6970, propertyClass: 'Vacant', taxAssessedValue: 38000, taxStatus: 'delinquent', taxDelinquentYrs: 1, lastSaleDate: new Date('2011-09-14'), lastSalePrice: 25000, neighborhood: 'East Atlanta Village', isAbsenteeOwner: false, latitude: 33.7320, longitude: -84.3400 },
  { parcelId: 'FUL-14-0600-001', ownerName: 'Linda G. Brown', ownerMailAddress: '6700 Peachtree Industrial', ownerMailCity: 'Norcross', ownerMailState: 'GA', ownerMailZip: '30092', propertyAddress: '322 Boulevard SE', propertyCity: 'Atlanta', propertyZip: '30315', county: 'Fulton', zoning: 'R3', lotSizeAcres: 0.15, lotSizeSqft: 6534, propertyClass: 'Vacant', taxAssessedValue: 20000, taxStatus: 'delinquent', taxDelinquentYrs: 3, lastSaleDate: new Date('2002-12-01'), lastSalePrice: 6000, neighborhood: 'Peoplestown', isAbsenteeOwner: true, latitude: 33.7350, longitude: -84.3850 },
  { parcelId: 'FUL-14-0600-002', ownerName: 'Raymond E. Lewis', ownerMailAddress: '322 McDonough Blvd', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30315', propertyAddress: '322 McDonough Blvd SE', propertyCity: 'Atlanta', propertyZip: '30315', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.24, lotSizeSqft: 10454, propertyClass: 'Unimproved', taxAssessedValue: 27000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2006-06-30'), lastSalePrice: 13000, neighborhood: 'South Atlanta', isAbsenteeOwner: false, latitude: 33.7200, longitude: -84.3830 },
  { parcelId: 'FUL-14-0700-001', ownerName: 'Michelle P. Jones', ownerMailAddress: '1800 Century Blvd NE', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30345', propertyAddress: '455 Moreland Ave SE', propertyCity: 'Atlanta', propertyZip: '30317', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.18, lotSizeSqft: 7841, propertyClass: 'Vacant', taxAssessedValue: 55000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2017-08-10'), lastSalePrice: 48000, neighborhood: 'Edgewood', isAbsenteeOwner: true, latitude: 33.7550, longitude: -84.3480 },
  { parcelId: 'FUL-14-0700-002', ownerName: 'Kevin D. White', ownerMailAddress: '455 Hosea Williams Dr', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30317', propertyAddress: '455 Hosea Williams Dr SE', propertyCity: 'Atlanta', propertyZip: '30317', county: 'Fulton', zoning: 'R3', lotSizeAcres: 0.14, lotSizeSqft: 6098, propertyClass: 'Vacant', taxAssessedValue: 48000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2019-01-22'), lastSalePrice: 42000, neighborhood: 'Edgewood', isAbsenteeOwner: false, latitude: 33.7580, longitude: -84.3460 },
  { parcelId: 'DKB-18-0100-001', ownerName: 'Brenda J. Wilson', ownerMailAddress: '5500 Memorial Dr', ownerMailCity: 'Stone Mountain', ownerMailState: 'GA', ownerMailZip: '30083', propertyAddress: '2150 E College Ave', propertyCity: 'Scottdale', propertyZip: '30079', county: 'DeKalb', zoning: 'R2', lotSizeAcres: 0.22, lotSizeSqft: 9583, propertyClass: 'Vacant', taxAssessedValue: 24000, taxStatus: 'delinquent', taxDelinquentYrs: 2, lastSaleDate: new Date('2004-10-25'), lastSalePrice: 10000, neighborhood: 'Scottdale', isAbsenteeOwner: true, latitude: 33.7900, longitude: -84.2700 },
  { parcelId: 'DKB-18-0100-002', ownerName: 'Charles H. Green', ownerMailAddress: '2150 N Decatur Rd', ownerMailCity: 'Decatur', ownerMailState: 'GA', ownerMailZip: '30033', propertyAddress: '2150 N Decatur Rd', propertyCity: 'Decatur', propertyZip: '30033', county: 'DeKalb', zoning: 'R3', lotSizeAcres: 0.17, lotSizeSqft: 7405, propertyClass: 'Vacant', taxAssessedValue: 58000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2020-03-05'), lastSalePrice: 52000, neighborhood: 'North Decatur', isAbsenteeOwner: false, latitude: 33.7880, longitude: -84.2900 },
  { parcelId: 'DKB-18-0200-001', ownerName: 'Sharon M. Thomas', ownerMailAddress: '900 DeKalb Ave NE', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30307', propertyAddress: '3355 Covington Hwy', propertyCity: 'Scottdale', propertyZip: '30032', county: 'DeKalb', zoning: 'R4', lotSizeAcres: 0.20, lotSizeSqft: 8712, propertyClass: 'Vacant', taxAssessedValue: 21000, taxStatus: 'delinquent', taxDelinquentYrs: 1, lastSaleDate: new Date('2013-07-18'), lastSalePrice: 15000, neighborhood: 'Scottdale', isAbsenteeOwner: true, latitude: 33.7700, longitude: -84.2600 },
  { parcelId: 'DKB-18-0200-002', ownerName: 'Ronald J. Adams', ownerMailAddress: '3355 Columbia Dr', ownerMailCity: 'Decatur', ownerMailState: 'GA', ownerMailZip: '30032', propertyAddress: '3355 Columbia Dr', propertyCity: 'Decatur', propertyZip: '30032', county: 'DeKalb', zoning: 'R3', lotSizeAcres: 0.25, lotSizeSqft: 10890, propertyClass: 'Unimproved', taxAssessedValue: 19000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2008-05-12'), lastSalePrice: 11000, neighborhood: 'Columbia Heights', isAbsenteeOwner: false, latitude: 33.7650, longitude: -84.2650 },
  { parcelId: 'DKB-18-0300-001', ownerName: 'Carolyn B. Baker', ownerMailAddress: '1100 Lake Hearn Dr', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30319', propertyAddress: '2780 Glenwood Rd', propertyCity: 'Decatur', propertyZip: '30032', county: 'DeKalb', zoning: 'R4', lotSizeAcres: 0.16, lotSizeSqft: 6970, propertyClass: 'Vacant', taxAssessedValue: 23000, taxStatus: 'delinquent', taxDelinquentYrs: 2, lastSaleDate: new Date('2006-02-14'), lastSalePrice: 9500, neighborhood: 'East Lake', isAbsenteeOwner: true, latitude: 33.7580, longitude: -84.2750 },
  { parcelId: 'FUL-14-0800-001', ownerName: 'Gregory A. Carter', ownerMailAddress: '200 Peachtree St NW', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30303', propertyAddress: '1580 Jonesboro Rd SE', propertyCity: 'Atlanta', propertyZip: '30315', county: 'Fulton', zoning: 'R2', lotSizeAcres: 0.28, lotSizeSqft: 12197, propertyClass: 'Vacant', taxAssessedValue: 16000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2000-09-30'), lastSalePrice: 5500, neighborhood: 'Lakewood Heights', isAbsenteeOwner: true, latitude: 33.7100, longitude: -84.3800 },
  { parcelId: 'FUL-14-0900-001', ownerName: 'Cynthia R. Hall', ownerMailAddress: '1580 Campbellton Rd', ownerMailCity: 'Atlanta', ownerMailState: 'GA', ownerMailZip: '30311', propertyAddress: '1580 Campbellton Rd SW', propertyCity: 'Atlanta', propertyZip: '30311', county: 'Fulton', zoning: 'R4', lotSizeAcres: 0.11, lotSizeSqft: 4792, propertyClass: 'Vacant', taxAssessedValue: 17000, taxStatus: 'delinquent', taxDelinquentYrs: 1, lastSaleDate: new Date('2011-04-08'), lastSalePrice: 8000, neighborhood: 'Cascade', isAbsenteeOwner: false, latitude: 33.7050, longitude: -84.4500 },
  { parcelId: 'FUL-14-0500-003', ownerName: 'Donald W. Mitchell', ownerMailAddress: '3700 Clairmont Rd', ownerMailCity: 'Chamblee', ownerMailState: 'GA', ownerMailZip: '30341', propertyAddress: '1222 McPherson Ave SE', propertyCity: 'Atlanta', propertyZip: '30316', county: 'Fulton', zoning: 'R5', lotSizeAcres: 0.20, lotSizeSqft: 8712, propertyClass: 'Vacant', taxAssessedValue: 40000, taxStatus: 'current', taxDelinquentYrs: 0, lastSaleDate: new Date('2013-11-11'), lastSalePrice: 28000, neighborhood: 'Ormewood Park', isAbsenteeOwner: true, latitude: 33.7280, longitude: -84.3520 },
]

async function main() {
  console.log('Seeding database...')

  // Create default settings
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
        '30079': 10, '30032': 9, '30033': 11, '30002': 8
      }),
    },
  })

  // Create default buy box
  await prisma.buyBox.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'ATL Infill Default',
      zonings: JSON.stringify(['R1', 'R2', 'R3', 'R4', 'R5']),
      minLotSizeAcres: 0.10,
      maxLotSizeAcres: 0.35,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30310', '30311', '30312', '30314', '30315', '30316', '30317', '30318', '30079', '30032', '30033', '30002']),
      maxTaxValue: 100000,
      absenteeOnly: false,
      excludeZonings: JSON.stringify(['C1', 'C2', 'I1', 'I2', 'O-I']),
      minLotSizeSqft: 4000,
      maxLotSizeSqft: 43560,
      isDefault: true,
    },
  })

  // Create buy box presets
  await prisma.buyBox.upsert({
    where: { id: 'westend' },
    update: {},
    create: {
      id: 'westend',
      name: 'West End Lots',
      zonings: JSON.stringify(['R4', 'R5']),
      minLotSizeAcres: 0.12,
      maxLotSizeAcres: 0.25,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30310', '30311', '30314']),
      maxTaxValue: 50000,
      absenteeOnly: false,
      minLotSizeSqft: 5000,
      isDefault: false,
    },
  })

  await prisma.buyBox.upsert({
    where: { id: 'scottdale' },
    update: {},
    create: {
      id: 'scottdale',
      name: 'Scottdale Corridor',
      zonings: JSON.stringify(['R2', 'R3', 'R4']),
      minLotSizeAcres: 0.15,
      maxLotSizeAcres: 0.30,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30079', '30032', '30033']),
      maxTaxValue: 60000,
      absenteeOnly: false,
      minLotSizeSqft: 6000,
      isDefault: false,
    },
  })

  await prisma.buyBox.upsert({
    where: { id: 'eastatlanta' },
    update: {},
    create: {
      id: 'eastatlanta',
      name: 'East Atlanta',
      zonings: JSON.stringify(['R3', 'R4', 'R5']),
      minLotSizeAcres: 0.14,
      maxLotSizeAcres: 0.25,
      propertyTypes: 'vacant,unimproved',
      targetZips: JSON.stringify(['30316', '30317', '30312']),
      maxTaxValue: 80000,
      absenteeOnly: false,
      minLotSizeSqft: 5500,
      isDefault: false,
    },
  })

  // Import scoring function
  const { calculateLeadScore } = await import('../lib/scoring')
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const neighborhoodScores = settings ? JSON.parse(settings.neighborhoodScores) : {}

  // Create lots with scores
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
      create: { ...lot, leadScore: score },
    })
  }

  console.log(`Seeded ${sampleLots.length} lots, 4 buy boxes, and default settings.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
