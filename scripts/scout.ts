/**
 * LotScout — unified county scanner.
 *
 * Usage:
 *   npx tsx scripts/scout.ts                # scan the 4 new counties (no insert)
 *   npx tsx scripts/scout.ts --insert       # scan + insert new leads into Supabase
 *   npx tsx scripts/scout.ts gwinnett jackson --insert
 *   npx tsx scripts/scout.ts all --insert   # every configured county
 *   npx tsx scripts/scout.ts paulding --insert --force   # allow degraded county
 *
 * Flags:
 *   --insert   write qualified new leads to Supabase (default is a dry run)
 *   --force    permit insert for DEGRADED counties (thin/no owner+value data)
 *   --email    send a summary email when done (requires Composio env)
 */
import { COUNTIES, NEW_COUNTY_KEYS } from './counties'
import { CountyConfig } from './lib/types'
import { fetchArcgisAll } from './lib/arcgis'
import { scoreLot, isAbsentee } from './lib/scoring'
import { getExistingParcelIds, insertLots } from './lib/supabase'
import { sendEmail } from './lib/notify'

interface CountyResult {
  name: string
  scanned: number
  qualified: number
  fresh: number
  inserted: number
  topScore: number
  degradedSkipped: boolean
}

async function scanCounty(cfg: CountyConfig, opts: { insert: boolean; force: boolean }): Promise<CountyResult> {
  console.log(`\n🔍 ${cfg.name}`)
  const raw = await fetchArcgisAll(cfg.endpoint, {
    where: cfg.where,
    outFields: cfg.outFields,
    orderBy: cfg.orderBy,
    pageSize: cfg.pageSize,
  })
  console.log(`  📦 ${raw.length} candidate parcels`)

  const lots = raw.map(a => cfg.mapRow(a)).filter((l): l is NonNullable<typeof l> => l != null)
  if (cfg.enrich) {
    console.log('  🔗 enriching owner data...')
    await cfg.enrich(lots)
  }

  for (const lot of lots) {
    lot.isAbsenteeOwner = isAbsentee(lot)
    lot.leadScore = scoreLot(lot, cfg)
  }

  const minScore = cfg.minScore ?? 40
  const qualified = lots.filter(l => (l.leadScore ?? 0) >= minScore).sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0))
  const topScore = qualified[0]?.leadScore ?? 0
  console.log(`  🔥 ${qualified.length} qualified (score ≥ ${minScore}), top ${topScore}`)

  // Print top 5 for visibility
  for (const l of qualified.slice(0, 5)) {
    console.log(`     ${String(l.leadScore).padStart(3)} | ${l.propertyAddress} ${l.propertyZip} | ${l.ownerName || '(owner n/a)'} | ${l.lotSizeAcres ?? '?'}ac`)
  }

  const result: CountyResult = {
    name: cfg.name, scanned: raw.length, qualified: qualified.length,
    fresh: 0, inserted: 0, topScore, degradedSkipped: false,
  }

  if (!opts.insert) {
    console.log('  ⏸  dry run (pass --insert to write to Supabase)')
    return result
  }

  if (cfg.degraded && !opts.force) {
    console.log('  ⚠️  DEGRADED county — owner/value/address not available via ArcGIS. Skipping insert (use --force to override).')
    result.degradedSkipped = true
    return result
  }

  const existing = await getExistingParcelIds(cfg.name)
  const fresh = qualified.filter(l => !existing.has(l.parcelId.trim()))
  result.fresh = fresh.length
  console.log(`  📊 ${existing.size} already in DB → ${fresh.length} new`)

  result.inserted = await insertLots(fresh)
  console.log(`  ✅ inserted ${result.inserted}`)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const insert = args.includes('--insert')
  const force = args.includes('--force')
  const email = args.includes('--email')
  const positional = args.filter(a => !a.startsWith('--'))

  let targets: CountyConfig[]
  if (positional.length === 0) {
    targets = COUNTIES.filter(c => NEW_COUNTY_KEYS.includes(c.key))
  } else if (positional.includes('all')) {
    targets = COUNTIES
  } else {
    const unknown = positional.filter(k => !COUNTIES.some(c => c.key === k.toLowerCase()))
    if (unknown.length) {
      console.error(`Unknown county key(s): ${unknown.join(', ')}`)
      console.error(`Available: ${COUNTIES.map(c => c.key).join(', ')}`)
      process.exit(1)
    }
    targets = positional
      .map(k => COUNTIES.find(c => c.key === k.toLowerCase())!)
  }

  console.log(`🛰  LotScout scanner — ${targets.map(t => t.name).join(', ')}${insert ? ' (INSERT)' : ' (dry run)'}`)

  const results: CountyResult[] = []
  for (const cfg of targets) {
    try {
      results.push(await scanCounty(cfg, { insert, force }))
    } catch (err) {
      console.error(`  ❌ ${cfg.name} failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log('\n═══════════ SUMMARY ═══════════')
  let totalInserted = 0
  for (const r of results) {
    const note = r.degradedSkipped ? ' (degraded — not inserted)' : ''
    console.log(`  ${r.name.padEnd(10)} scanned ${String(r.scanned).padStart(5)} | qualified ${String(r.qualified).padStart(4)} | new ${String(r.fresh).padStart(4)} | inserted ${String(r.inserted).padStart(4)}${note}`)
    totalInserted += r.inserted
  }
  console.log(`  Total inserted: ${totalInserted}`)

  if (email && totalInserted > 0) {
    const body = results
      .filter(r => r.inserted > 0)
      .map(r => `${r.name}: ${r.inserted} new lots (top score ${r.topScore})`)
      .join('\n')
    await sendEmail(`LotScout: ${totalInserted} new lots added`, `${body}\n\nView: https://lotscout.vercel.app`)
  }
  console.log('🏁 Done')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
