/**
 * Unified buy-box lead scorer (0–100), shared across all counties.
 *
 * Replaces the slightly-divergent per-county scorers. Inputs are the
 * county-agnostic NormalizedLot fields plus per-county weights.
 */
import { NormalizedLot, CountyConfig } from './types'

/** Owner mails to a different address/ZIP than the lot → likely absentee. */
export function isAbsentee(lot: NormalizedLot): boolean {
  const mail = (lot.ownerMailAddress || '').toUpperCase().trim()
  const site = (lot.propertyAddress || '').toUpperCase().trim()
  if (mail && site) {
    const siteNum = site.split(' ')[0]
    if (siteNum && /\d/.test(siteNum) && !mail.includes(siteNum)) return true
  }
  const mZip = (lot.ownerMailZip || '').slice(0, 5)
  const pZip = (lot.propertyZip || '').slice(0, 5)
  if (mZip && pZip && mZip !== pZip) return true
  return false
}

export function scoreLot(lot: NormalizedLot, cfg: CountyConfig): number {
  let score = 0
  const zc = `${lot.zoning || ''} ${lot.propertyClass || ''}`.toUpperCase()

  // Residential / vacant signal (up to 22)
  if (/R-?5|MR-?2|RA200|\bR3\b|\bR4\b|\bR5\b|VACANT|\bV\b/.test(zc)) score += 22
  else if (/R-?4|R-?3|R-?100|R-?85|\bR2\b/.test(zc)) score += 16
  else if (/R-?\d|MR|RESIDENT/.test(zc)) score += 10

  // Lot-size sweet spot (20)
  const a = lot.lotSizeAcres ?? 0
  if (a >= 0.14 && a <= 0.22) score += 20
  else if (a >= 0.12 && a <= 0.25) score += 15
  else if (a >= 0.1 && a <= 0.3) score += 10
  else if (a >= 0.08 && a <= 0.5) score += 6
  else if (a > 0.5) score += 4

  // Absentee owner (15)
  if (lot.isAbsenteeOwner) score += 15

  // Low / zero assessed value (15); unknown value is neutral-ish
  const v = lot.taxAssessedValue
  if (v == null) score += 6
  else if (v === 0) score += 15
  else if (v < 10_000) score += 12
  else if (v < 25_000) score += 8
  else if (v < 50_000) score += 5

  // Neighborhood ZIP weight (capped 15)
  score += Math.min(cfg.zipScores?.[lot.propertyZip] ?? 0, 15)

  // Flat regional premium
  score += cfg.basePremium ?? 0

  // Vacant-address hints (10)
  if (/^0\s|REAR|\bLOT\b/.test((lot.propertyAddress || '').toUpperCase())) score += 10

  return Math.min(Math.round(score), 100)
}
