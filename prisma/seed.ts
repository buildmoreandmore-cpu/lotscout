import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding default settings and buy boxes...')

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

  console.log('Seeded default settings and 3 buy boxes.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
