'use client'
import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/calculations'
import DealCalculator from '@/components/DealCalculator'

interface Stats {
  totalLots: number
  statusCounts: Record<string, number>
  zipBreakdown: { zip: string; count: number; avgScore: number; avgTaxValue: number }[]
  scoreStats: { _avg: { leadScore: number }; _max: { leadScore: number }; _min: { leadScore: number } }
  delinquentCount: number
  absenteeCount: number
  closedDeals: number
  totalRevenue: number
  pipelineValue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [showCalc, setShowCalc] = useState(false)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-full"><div className="text-slate-500">Loading dashboard...</div></div>

  const statusLabels: Record<string, string> = {
    new: 'New Leads', contacted: 'Contacted', interested: 'Interested',
    under_contract: 'Under Contract', closed: 'Closed', dead: 'Dead',
  }
  const statusColors: Record<string, string> = {
    new: 'bg-blue-500', contacted: 'bg-purple-500', interested: 'bg-yellow-500',
    under_contract: 'bg-orange-500', closed: 'bg-green-500', dead: 'bg-red-500',
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Atlanta Metro Infill Lot Pipeline</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Lots</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-100 font-mono-nums mt-1">{formatNumber(stats.totalLots)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Absentee</p>
          <p className="text-2xl md:text-3xl font-bold text-green-400 font-mono-nums mt-1">{formatNumber(stats.absenteeCount)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Tax Delinquent</p>
          <p className="text-2xl md:text-3xl font-bold text-yellow-400 font-mono-nums mt-1">{formatNumber(stats.delinquentCount)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Score</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-100 font-mono-nums mt-1">{Math.round(stats.scoreStats._avg.leadScore || 0)}</p>
        </div>
      </div>

      {/* Pipeline + Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Closed Deals</p>
          <p className="text-2xl md:text-3xl font-bold text-green-400 font-mono-nums mt-1">{stats.closedDeals}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl md:text-3xl font-bold text-green-400 font-mono-nums mt-1">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Pipeline Value</p>
          <p className="text-2xl md:text-3xl font-bold text-yellow-400 font-mono-nums mt-1">{formatCurrency(stats.pipelineValue)}</p>
        </div>
      </div>

      {/* Pipeline Status Bars */}
      <div className="card">
        <h2 className="text-base md:text-lg font-semibold text-slate-200 mb-4">Pipeline Breakdown</h2>
        <div className="space-y-3">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = stats.statusCounts[key] || 0
            const pct = stats.totalLots > 0 ? (count / stats.totalLots) * 100 : 0
            return (
              <div key={key} className="flex items-center gap-2 md:gap-3">
                <span className="text-xs md:text-sm text-slate-400 w-20 md:w-32 shrink-0 truncate">{label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-5 md:h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[key]} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="text-sm font-mono-nums text-slate-300 w-8 md:w-10 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Neighborhood Breakdown */}
      <div className="card">
        <h2 className="text-base md:text-lg font-semibold text-slate-200 mb-4">By ZIP Code</h2>
        <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="table-header">ZIP</th>
                <th className="table-header">Lots</th>
                <th className="table-header">Avg Score</th>
                <th className="table-header">Avg Tax Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.zipBreakdown
                .sort((a, b) => b.count - a.count)
                .map((z) => (
                  <tr key={z.zip} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="table-cell font-mono-nums font-medium text-slate-200">{z.zip}</td>
                    <td className="table-cell font-mono-nums">{z.count}</td>
                    <td className="table-cell font-mono-nums">
                      <span className={`badge ${z.avgScore >= 75 ? 'score-green' : z.avgScore >= 50 ? 'score-yellow' : 'score-red'}`}>
                        {z.avgScore}
                      </span>
                    </td>
                    <td className="table-cell font-mono-nums">{formatCurrency(z.avgTaxValue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
