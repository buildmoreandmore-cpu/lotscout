export interface DealCalculation {
  estimatedArv: number
  buildCostPerSqft: number
  buildSqft: number
  totalBuildCost: number
  wholesaleFee: number
  builderMargin: number
  arvMultiplier: number
  maxLotOffer: number
  totalBasis: number
  builderProfit: number
  builderProfitPct: number
}

export function calculateDeal(params: {
  estimatedArv: number
  buildCostPerSqft?: number
  buildSqft?: number
  wholesaleFee?: number
  builderMargin?: number
  arvMultiplier?: number
}): DealCalculation {
  const {
    estimatedArv,
    buildCostPerSqft = 165,
    buildSqft = 1600,
    wholesaleFee = 10000,
    builderMargin = 0.20,
    arvMultiplier = 0.80,
  } = params

  const totalBuildCost = buildSqft * buildCostPerSqft
  const maxLotOffer = estimatedArv * arvMultiplier - totalBuildCost - wholesaleFee
  const totalBasis = maxLotOffer + totalBuildCost + wholesaleFee
  const builderProfit = estimatedArv - totalBasis
  const builderProfitPct = estimatedArv > 0 ? builderProfit / estimatedArv : 0

  return {
    estimatedArv,
    buildCostPerSqft,
    buildSqft,
    totalBuildCost,
    wholesaleFee,
    builderMargin,
    arvMultiplier,
    maxLotOffer: Math.max(0, maxLotOffer),
    totalBasis,
    builderProfit,
    builderProfitPct,
  }
}

export function calculateArvFromComps(comps: { salePrice: number; sqft: number }[]): {
  avgPricePerSqft: number
  estimatedArv: number
} | null {
  if (comps.length === 0) return null
  const avgPricePerSqft = comps.reduce((sum, c) => sum + c.salePrice / c.sqft, 0) / comps.length
  const estimatedArv = comps.reduce((sum, c) => sum + c.salePrice, 0) / comps.length
  return { avgPricePerSqft: Math.round(avgPricePerSqft), estimatedArv: Math.round(estimatedArv) }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%'
}
