interface LotData {
  zoning: string | null
  lotSizeAcres: number | null
  isAbsenteeOwner: boolean
  taxDelinquentYrs: number
  lastSaleDate: Date | string | null
  propertyZip: string
  neighborhood: string | null
}

interface ScoreConfig {
  neighborhoodScores?: Record<string, number>
}

export function calculateLeadScore(lot: LotData, config: ScoreConfig = {}): number {
  let score = 0

  // Zoning flexibility (25 points): R4+ scores higher
  if (lot.zoning) {
    const z = lot.zoning.toUpperCase()
    if (z.includes('R5') || z.includes('R-5')) score += 25
    else if (z.includes('R4') || z.includes('R-4')) score += 22
    else if (z.includes('R3') || z.includes('R-3')) score += 18
    else if (z.includes('R2') || z.includes('R-2')) score += 12
    else if (z.includes('R1') || z.includes('R-1')) score += 8
    else if (z.includes('MR')) score += 25
  }

  // Lot size sweet spot (20 points): 0.14-0.22 acres scores highest
  if (lot.lotSizeAcres) {
    const acres = lot.lotSizeAcres
    if (acres >= 0.14 && acres <= 0.22) score += 20
    else if (acres >= 0.12 && acres <= 0.25) score += 15
    else if (acres >= 0.10 && acres <= 0.30) score += 10
    else if (acres >= 0.08 && acres <= 0.35) score += 5
  }

  // Absentee owner (15 points)
  if (lot.isAbsenteeOwner) score += 15

  // Tax delinquency (15 points)
  if (lot.taxDelinquentYrs > 0) {
    score += Math.min(lot.taxDelinquentYrs * 5, 15)
  }

  // Time owned / days vacant (10 points)
  if (lot.lastSaleDate) {
    const saleDate = new Date(lot.lastSaleDate)
    const yearsOwned = (Date.now() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (yearsOwned > 10) score += 10
    else if (yearsOwned > 5) score += 7
    else if (yearsOwned > 3) score += 5
    else if (yearsOwned > 1) score += 3
  } else {
    score += 8 // No sale date = likely long-term owner
  }

  // Neighborhood premium (15 points)
  const neighborhoodScores = config.neighborhoodScores || {}
  const zipScore = neighborhoodScores[lot.propertyZip] || 0
  score += Math.min(zipScore, 15)

  return Math.min(score, 100)
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (score >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-red-500/20 text-red-400 border-red-500/30'
}
