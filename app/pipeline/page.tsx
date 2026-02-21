'use client'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/calculations'

interface PipelineLot {
  id: string
  parcelId: string
  ownerName: string
  propertyAddress: string
  propertyZip: string
  leadScore: number
  leadStatus: string
  taxAssessedValue: number | null
  neighborhood: string | null
  contacts: { date: string; method: string }[]
  deal: { maxLotOffer: number; wholesaleFee: number } | null
}

interface PipelineData {
  pipeline: Record<string, { count: number; lots: PipelineLot[] }>
  summary: { leadStatus: string; _count: { id: number } }[]
  needFollowUp: PipelineLot[]
}

const statusConfig: Record<string, { label: string; color: string; bgClass: string }> = {
  new: { label: 'New Leads', color: '#3b82f6', bgClass: 'bg-blue-500/10 border-blue-500/30' },
  contacted: { label: 'Contacted', color: '#a855f7', bgClass: 'bg-purple-500/10 border-purple-500/30' },
  interested: { label: 'Interested', color: '#eab308', bgClass: 'bg-yellow-500/10 border-yellow-500/30' },
  under_contract: { label: 'Under Contract', color: '#f97316', bgClass: 'bg-orange-500/10 border-orange-500/30' },
  closed: { label: 'Closed', color: '#22c55e', bgClass: 'bg-green-500/10 border-green-500/30' },
  dead: { label: 'Dead', color: '#ef4444', bgClass: 'bg-red-500/10 border-red-500/30' },
}

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [expandedStatus, setExpandedStatus] = useState<string | null>('new')

  useEffect(() => {
    fetch('/api/pipeline').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="text-slate-500 flex items-center justify-center h-full">Loading pipeline...</div>

  const handleStatusChange = async (lotId: string, newStatus: string) => {
    await fetch(`/api/lots/${lotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: newStatus }),
    })
    const res = await fetch('/api/pipeline')
    setData(await res.json())
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pipeline</h1>
        <p className="text-sm text-slate-500">Manage your outreach and deal flow</p>
      </div>

      {/* Follow-up Alerts */}
      {data.needFollowUp.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">
            Follow-up Needed ({data.needFollowUp.length})
          </h3>
          <div className="space-y-1">
            {data.needFollowUp.slice(0, 5).map(lot => (
              <div key={lot.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{lot.propertyAddress} — {lot.ownerName}</span>
                <span className="text-xs text-slate-500">
                  Last contact: {lot.contacts[0] ? new Date(lot.contacts[0].date).toLocaleDateString() : 'Never'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Columns */}
      <div className="space-y-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const stage = data.pipeline[status] || { count: 0, lots: [] }
          const isExpanded = expandedStatus === status

          return (
            <div key={status} className={`border rounded-xl ${config.bgClass}`}>
              <button
                onClick={() => setExpandedStatus(isExpanded ? null : status)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  <h3 className="font-semibold text-slate-200">{config.label}</h3>
                  <span className="badge bg-slate-700 text-slate-300 font-mono-nums">{stage.count}</span>
                </div>
                <span className="text-slate-500">{isExpanded ? '−' : '+'}</span>
              </button>

              {isExpanded && stage.lots.length > 0 && (
                <div className="px-4 pb-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="table-header">Score</th>
                        <th className="table-header">Address</th>
                        <th className="table-header">Owner</th>
                        <th className="table-header">ZIP</th>
                        <th className="table-header">Last Contact</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.lots.map(lot => (
                        <tr key={lot.id} className="border-b border-slate-700/30">
                          <td className="table-cell">
                            <span className={`badge font-mono-nums ${lot.leadScore >= 75 ? 'score-green' : lot.leadScore >= 50 ? 'score-yellow' : 'score-red'}`}>
                              {lot.leadScore}
                            </span>
                          </td>
                          <td className="table-cell text-slate-200 text-sm">{lot.propertyAddress}</td>
                          <td className="table-cell text-slate-300 text-sm">{lot.ownerName}</td>
                          <td className="table-cell font-mono-nums text-slate-400 text-sm">{lot.propertyZip}</td>
                          <td className="table-cell text-xs text-slate-500">
                            {lot.contacts[0] ? (
                              <span>{lot.contacts[0].method} — {new Date(lot.contacts[0].date).toLocaleDateString()}</span>
                            ) : 'None'}
                          </td>
                          <td className="table-cell">
                            <select
                              value={status}
                              onChange={e => handleStatusChange(lot.id, e.target.value)}
                              className="select text-xs py-1"
                            >
                              {Object.entries(statusConfig).map(([s, c]) => (
                                <option key={s} value={s}>{c.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
