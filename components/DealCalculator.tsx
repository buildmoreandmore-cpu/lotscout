'use client'
import { useState } from 'react'
import { calculateDeal, formatCurrency, formatPercent } from '@/lib/calculations'

interface Props {
  initialArv?: number
  onSave?: (deal: ReturnType<typeof calculateDeal>) => void
}

export default function DealCalculator({ initialArv, onSave }: Props) {
  const [arv, setArv] = useState(initialArv || 420000)
  const [buildCost, setBuildCost] = useState(165)
  const [buildSqft, setBuildSqft] = useState(1600)
  const [wholesaleFee, setWholesaleFee] = useState(10000)
  const [arvMultiplier, setArvMultiplier] = useState(0.80)

  const deal = calculateDeal({
    estimatedArv: arv,
    buildCostPerSqft: buildCost,
    buildSqft,
    wholesaleFee,
    arvMultiplier,
  })

  return (
    <div>
      <h3 className="text-base md:text-lg font-semibold text-slate-200 mb-4">Deal Calculator</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        <div>
          <label className="label">Est. ARV</label>
          <input type="number" value={arv} onChange={e => setArv(Number(e.target.value))} className="input w-full font-mono-nums" />
        </div>
        <div>
          <label className="label">Build $/sqft</label>
          <input type="number" value={buildCost} onChange={e => setBuildCost(Number(e.target.value))} className="input w-full font-mono-nums" />
        </div>
        <div>
          <label className="label">Build Sqft</label>
          <input type="number" value={buildSqft} onChange={e => setBuildSqft(Number(e.target.value))} className="input w-full font-mono-nums" />
        </div>
        <div>
          <label className="label">Wholesale Fee</label>
          <input type="number" value={wholesaleFee} onChange={e => setWholesaleFee(Number(e.target.value))} className="input w-full font-mono-nums" />
        </div>
        <div>
          <label className="label">ARV Multiplier</label>
          <input type="number" step="0.01" value={arvMultiplier} onChange={e => setArvMultiplier(Number(e.target.value))} className="input w-full font-mono-nums" />
        </div>
      </div>

      {/* Deal Stack */}
      <div className="bg-slate-900 rounded-lg p-3 md:p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Deal Stack</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Estimated ARV</span>
            <span className="font-mono-nums text-slate-200">{formatCurrency(deal.estimatedArv)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Max Lot Offer <span className="hidden sm:inline">({formatPercent(arvMultiplier)} rule)</span></span>
            <span className="font-mono-nums text-green-400 font-bold">{formatCurrency(deal.maxLotOffer)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Build Cost <span className="hidden sm:inline">({buildSqft} sqft &times; ${buildCost})</span></span>
            <span className="font-mono-nums text-slate-200">{formatCurrency(deal.totalBuildCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Wholesale Fee</span>
            <span className="font-mono-nums text-slate-200">{formatCurrency(deal.wholesaleFee)}</span>
          </div>
          <hr className="border-slate-700" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Basis</span>
            <span className="font-mono-nums text-slate-200">{formatCurrency(deal.totalBasis)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className={deal.builderProfit > 0 ? 'text-green-400' : 'text-red-400'}>Builder Profit</span>
            <span className={`font-mono-nums ${deal.builderProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(deal.builderProfit)} ({formatPercent(deal.builderProfitPct)})
            </span>
          </div>
        </div>
      </div>

      {onSave && (
        <button onClick={() => onSave(deal)} className="btn-primary mt-4 w-full">
          Save Deal Analysis
        </button>
      )}
    </div>
  )
}
