'use client'
import { useEffect, useState } from 'react'
import { formatCurrency, formatPercent } from '@/lib/calculations'
import DealCalculator from '@/components/DealCalculator'

interface Deal {
  id: string
  lotId: string
  estimatedArv: number | null
  buildCostPerSqft: number
  buildSqft: number
  totalBuildCost: number | null
  maxLotOffer: number | null
  wholesaleFee: number
  builderMargin: number
  offerPrice: number | null
  status: string
  notes: string | null
  lot: {
    propertyAddress: string
    propertyZip: string
    ownerName: string
    neighborhood: string | null
    leadScore: number
  }
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [showCalc, setShowCalc] = useState(false)

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(setDeals)
  }, [])

  const handleStatusUpdate = async (dealId: string, status: string) => {
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const res = await fetch('/api/deals')
    setDeals(await res.json())
  }

  const statusColors: Record<string, string> = {
    analyzing: 'bg-blue-500/20 text-blue-400',
    offered: 'bg-yellow-500/20 text-yellow-400',
    accepted: 'bg-orange-500/20 text-orange-400',
    closed: 'bg-green-500/20 text-green-400',
  }

  const totalPipeline = deals.filter(d => d.status !== 'closed').reduce((s, d) => s + (d.maxLotOffer || 0), 0)
  const totalClosed = deals.filter(d => d.status === 'closed').reduce((s, d) => s + (d.wholesaleFee || 0), 0)

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Deals</h1>
          <p className="text-xs md:text-sm text-slate-500">{deals.length} active deals</p>
        </div>
        <button onClick={() => setShowCalc(!showCalc)} className="btn-primary text-sm w-full sm:w-auto">
          {showCalc ? 'Hide Calculator' : 'Quick Calculator'}
        </button>
      </div>

      {showCalc && (
        <div className="card">
          <DealCalculator />
        </div>
      )}

      {/* Deal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase">Active Deals</p>
          <p className="text-xl md:text-2xl font-bold text-slate-100 font-mono-nums mt-1">{deals.filter(d => d.status !== 'closed').length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase">Pipeline Value</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-400 font-mono-nums mt-1">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase">Closed</p>
          <p className="text-xl md:text-2xl font-bold text-green-400 font-mono-nums mt-1">{deals.filter(d => d.status === 'closed').length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase">Revenue</p>
          <p className="text-xl md:text-2xl font-bold text-green-400 font-mono-nums mt-1">{formatCurrency(totalClosed)}</p>
        </div>
      </div>

      {/* Deals */}
      {deals.length > 0 ? (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {deals.map(deal => {
              const arv = deal.estimatedArv || 0
              const totalBasis = (deal.maxLotOffer || 0) + (deal.totalBuildCost || 0) + deal.wholesaleFee
              const builderProfit = arv - totalBasis
              const profitPct = arv > 0 ? builderProfit / arv : 0

              return (
                <div key={deal.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{deal.lot.propertyAddress}</p>
                      <p className="text-xs text-slate-500">{deal.lot.ownerName} &middot; {deal.lot.propertyZip}</p>
                    </div>
                    <span className={`badge ${statusColors[deal.status] || 'bg-slate-700 text-slate-300'} capitalize shrink-0`}>
                      {deal.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">ARV:</span> <span className="font-mono-nums text-slate-200 ml-1">{formatCurrency(arv)}</span></div>
                    <div><span className="text-slate-500">Build:</span> <span className="font-mono-nums text-slate-200 ml-1">{formatCurrency(deal.totalBuildCost || 0)}</span></div>
                    <div><span className="text-slate-500">Max Offer:</span> <span className="font-mono-nums text-green-400 font-bold ml-1">{formatCurrency(deal.maxLotOffer || 0)}</span></div>
                    <div><span className="text-slate-500">W/S Fee:</span> <span className="font-mono-nums text-slate-200 ml-1">{formatCurrency(deal.wholesaleFee)}</span></div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <div className={`text-sm font-bold font-mono-nums ${builderProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Profit: {formatCurrency(builderProfit)} ({formatPercent(profitPct)})
                    </div>
                    <select
                      value={deal.status}
                      onChange={e => handleStatusUpdate(deal.id, e.target.value)}
                      className="select text-xs py-1.5"
                    >
                      <option value="analyzing">Analyzing</option>
                      <option value="offered">Offered</option>
                      <option value="accepted">Accepted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="table-header">Property</th>
                  <th className="table-header">ARV</th>
                  <th className="table-header">Build Cost</th>
                  <th className="table-header">Max Offer</th>
                  <th className="table-header">W/S Fee</th>
                  <th className="table-header">Builder Profit</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map(deal => {
                  const arv = deal.estimatedArv || 0
                  const totalBasis = (deal.maxLotOffer || 0) + (deal.totalBuildCost || 0) + deal.wholesaleFee
                  const builderProfit = arv - totalBasis
                  const profitPct = arv > 0 ? builderProfit / arv : 0

                  return (
                    <tr key={deal.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                      <td className="table-cell">
                        <p className="text-sm font-medium text-slate-200">{deal.lot.propertyAddress}</p>
                        <p className="text-xs text-slate-500">{deal.lot.ownerName} &middot; {deal.lot.propertyZip}</p>
                      </td>
                      <td className="table-cell font-mono-nums">{formatCurrency(arv)}</td>
                      <td className="table-cell font-mono-nums">{formatCurrency(deal.totalBuildCost || 0)}</td>
                      <td className="table-cell font-mono-nums text-green-400 font-bold">{formatCurrency(deal.maxLotOffer || 0)}</td>
                      <td className="table-cell font-mono-nums">{formatCurrency(deal.wholesaleFee)}</td>
                      <td className="table-cell">
                        <span className={`font-mono-nums ${builderProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(builderProfit)} ({formatPercent(profitPct)})
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusColors[deal.status] || 'bg-slate-700 text-slate-300'} capitalize`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <select
                          value={deal.status}
                          onChange={e => handleStatusUpdate(deal.id, e.target.value)}
                          className="select text-xs py-1"
                        >
                          <option value="analyzing">Analyzing</option>
                          <option value="offered">Offered</option>
                          <option value="accepted">Accepted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-slate-500">No deals yet. Create a deal from the Lot Detail page.</p>
        </div>
      )}
    </div>
  )
}
