'use client'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/calculations'
import DealCalculator from './DealCalculator'

interface Lot {
  id: string
  parcelId: string
  ownerName: string
  ownerMailAddress: string | null
  ownerMailCity: string | null
  ownerMailState: string | null
  ownerMailZip: string | null
  propertyAddress: string
  propertyCity: string | null
  propertyZip: string
  county: string
  zoning: string | null
  lotSizeAcres: number | null
  lotSizeSqft: number | null
  propertyClass: string | null
  taxAssessedValue: number | null
  taxStatus: string
  taxDelinquentYrs: number
  lastSaleDate: string | null
  lastSalePrice: number | null
  isAbsenteeOwner: boolean
  leadScore: number
  leadStatus: string
  inPipeline: boolean
  neighborhood: string | null
  notes: string | null
  contacts: Contact[]
  comps: Comp[]
  deal: any
}

interface Contact {
  id: string
  date: string
  method: string
  notes: string | null
  campaign: string | null
  response: string | null
  followUpDate: string | null
}

interface Comp {
  id: string
  address: string
  salePrice: number
  sqft: number
  saleDate: string
  pricePerSqft: number | null
}

interface Props {
  lotId: string
  onBack: () => void
}

export default function LotDetail({ lotId, onBack }: Props) {
  const [lot, setLot] = useState<Lot | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'contacts' | 'comps' | 'deal'>('details')
  const [contactForm, setContactForm] = useState({ method: 'call', notes: '', campaign: '', followUpDate: '' })
  const [compForm, setCompForm] = useState({ address: '', salePrice: '', sqft: '', saleDate: '' })

  const fetchLot = () => fetch(`/api/lots/${lotId}`).then(r => r.json()).then(setLot)
  useEffect(() => { fetchLot() }, [lotId])

  if (!lot) return <div className="text-slate-500">Loading...</div>

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/lots/${lotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: newStatus }),
    })
    fetchLot()
  }

  const handleTogglePipeline = async () => {
    await fetch(`/api/lots/${lotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inPipeline: !lot.inPipeline }),
    })
    fetchLot()
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/lots/${lotId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    })
    setContactForm({ method: 'call', notes: '', campaign: '', followUpDate: '' })
    fetchLot()
  }

  const handleAddComp = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/lots/${lotId}/comps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...compForm,
        salePrice: parseFloat(compForm.salePrice),
        sqft: parseFloat(compForm.sqft),
      }),
    })
    setCompForm({ address: '', salePrice: '', sqft: '', saleDate: '' })
    fetchLot()
  }

  const handleSaveDeal = async (deal: any) => {
    const avgArv = lot.comps.length > 0
      ? lot.comps.reduce((s, c) => s + c.salePrice, 0) / lot.comps.length
      : deal.estimatedArv

    await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId,
        estimatedArv: avgArv,
        buildCostPerSqft: deal.buildCostPerSqft,
        buildSqft: deal.buildSqft,
        wholesaleFee: deal.wholesaleFee,
      }),
    })
    fetchLot()
  }

  const statuses = ['new', 'contacted', 'interested', 'under_contract', 'closed', 'dead']

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-300 mb-2 py-1">&larr; Back to lots</button>
          <h1 className="text-lg md:text-xl font-bold text-slate-100 truncate">{lot.propertyAddress}</h1>
          <p className="text-xs md:text-sm text-slate-400">{lot.propertyCity}, GA {lot.propertyZip} &middot; {lot.county} County</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge text-lg font-mono-nums px-3 py-1 ${lot.leadScore >= 75 ? 'score-green' : lot.leadScore >= 50 ? 'score-yellow' : 'score-red'}`}>
            {lot.leadScore}
          </span>
          <button
            onClick={handleTogglePipeline}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              lot.inPipeline
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30'
            }`}
          >
            {lot.inPipeline ? 'In Pipeline' : 'Add to Pipeline'}
          </button>
          <select
            value={lot.leadStatus}
            onChange={e => handleStatusChange(e.target.value)}
            className="select text-sm"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        <div className="card py-3 px-3 md:px-4">
          <p className="text-xs text-slate-500">Zoning</p>
          <p className="font-bold text-slate-200">{lot.zoning || '—'}</p>
        </div>
        <div className="card py-3 px-3 md:px-4">
          <p className="text-xs text-slate-500">Lot Size</p>
          <p className="font-bold text-slate-200 font-mono-nums">{lot.lotSizeAcres?.toFixed(2) || '—'} ac</p>
          {lot.lotSizeSqft && <p className="text-xs text-slate-500 font-mono-nums">{Math.round(lot.lotSizeSqft).toLocaleString()} sqft</p>}
        </div>
        <div className="card py-3 px-3 md:px-4">
          <p className="text-xs text-slate-500">Tax Value</p>
          <p className="font-bold text-slate-200 font-mono-nums text-sm">{lot.taxAssessedValue ? formatCurrency(lot.taxAssessedValue) : '—'}</p>
        </div>
        <div className="card py-3 px-3 md:px-4">
          <p className="text-xs text-slate-500">Tax Status</p>
          <p className={`font-bold text-sm ${lot.taxStatus === 'delinquent' ? 'text-red-400' : 'text-green-400'}`}>
            {lot.taxStatus === 'delinquent' ? `${lot.taxDelinquentYrs}yr Delinq.` : 'Current'}
          </p>
        </div>
        <div className="card py-3 px-3 md:px-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">Owner</p>
          <p className="font-bold text-slate-200 text-sm truncate">{lot.ownerName}</p>
          {lot.isAbsenteeOwner && <span className="badge bg-purple-500/20 text-purple-400 text-xs mt-1">Absentee</span>}
        </div>
      </div>

      {/* Owner Mailing Address */}
      {lot.ownerMailAddress && (
        <div className="card py-3">
          <p className="text-xs text-slate-500 mb-1">Owner Mailing Address</p>
          <p className="text-sm text-slate-300">{lot.ownerMailAddress}, {lot.ownerMailCity} {lot.ownerMailState} {lot.ownerMailZip}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-700 overflow-x-auto">
        {(['details', 'contacts', 'comps', 'deal'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 md:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab ? 'border-green-500 text-green-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'contacts' && ` (${lot.contacts.length})`}
            {tab === 'comps' && ` (${lot.comps.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Parcel ID:</span> <span className="text-slate-200 font-mono-nums ml-2">{lot.parcelId}</span></div>
            <div><span className="text-slate-500">Property Class:</span> <span className="text-slate-200 ml-2">{lot.propertyClass || '—'}</span></div>
            <div><span className="text-slate-500">Last Sale:</span> <span className="text-slate-200 ml-2">{lot.lastSaleDate ? new Date(lot.lastSaleDate).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-slate-500">Last Sale Price:</span> <span className="text-slate-200 font-mono-nums ml-2">{lot.lastSalePrice ? formatCurrency(lot.lastSalePrice) : '—'}</span></div>
            <div><span className="text-slate-500">Neighborhood:</span> <span className="text-slate-200 ml-2">{lot.neighborhood || '—'}</span></div>
          </div>
          {lot.notes && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-300">{lot.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <form onSubmit={handleAddContact} className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Log Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">Method</label>
                <select value={contactForm.method} onChange={e => setContactForm(f => ({ ...f, method: e.target.value }))} className="select w-full">
                  <option value="call">Call</option>
                  <option value="text">Text</option>
                  <option value="mail">Mail</option>
                  <option value="door_knock">Door Knock</option>
                </select>
              </div>
              <div>
                <label className="label">Campaign</label>
                <input value={contactForm.campaign} onChange={e => setContactForm(f => ({ ...f, campaign: e.target.value }))} className="input w-full" placeholder="e.g. Jan Mailer" />
              </div>
              <div>
                <label className="label">Follow-up Date</label>
                <input type="date" value={contactForm.followUpDate} onChange={e => setContactForm(f => ({ ...f, followUpDate: e.target.value }))} className="input w-full" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">Log</button>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Notes</label>
              <textarea value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} className="input w-full" rows={2} />
            </div>
          </form>

          {lot.contacts.length > 0 ? (
            <div className="space-y-2">
              {lot.contacts.map(c => (
                <div key={c.id} className="card py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-slate-700 text-slate-300 capitalize">{c.method.replace('_', ' ')}</span>
                    <span className="text-xs text-slate-500">{new Date(c.date).toLocaleDateString()}</span>
                    {c.campaign && <span className="text-xs text-slate-500">&middot; {c.campaign}</span>}
                    {c.followUpDate && <span className="text-xs text-yellow-400">&middot; Follow-up: {new Date(c.followUpDate).toLocaleDateString()}</span>}
                  </div>
                  {c.notes && <p className="text-sm text-slate-300 mt-2">{c.notes}</p>}
                  {c.response && <p className="text-sm text-green-400 mt-1">Response: {c.response}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No contacts logged yet</p>
          )}
        </div>
      )}

      {activeTab === 'comps' && (
        <div className="space-y-4">
          <form onSubmit={handleAddComp} className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Add Comparable Sale (New Construction)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">Address</label>
                <input value={compForm.address} onChange={e => setCompForm(f => ({ ...f, address: e.target.value }))} className="input w-full" required />
              </div>
              <div>
                <label className="label">Sale Price</label>
                <input type="number" value={compForm.salePrice} onChange={e => setCompForm(f => ({ ...f, salePrice: e.target.value }))} className="input w-full font-mono-nums" required />
              </div>
              <div>
                <label className="label">Sqft</label>
                <input type="number" value={compForm.sqft} onChange={e => setCompForm(f => ({ ...f, sqft: e.target.value }))} className="input w-full font-mono-nums" required />
              </div>
              <div>
                <label className="label">Sale Date</label>
                <input type="date" value={compForm.saleDate} onChange={e => setCompForm(f => ({ ...f, saleDate: e.target.value }))} className="input w-full" required />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-3 w-full sm:w-auto">Add Comp</button>
          </form>

          {lot.comps.length > 0 ? (
            <div>
              {/* Mobile comp cards */}
              <div className="sm:hidden space-y-2">
                {lot.comps.map(c => (
                  <div key={c.id} className="card py-3">
                    <p className="text-sm font-medium text-slate-200">{c.address}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs">
                      <span className="font-mono-nums text-green-400">{formatCurrency(c.salePrice)}</span>
                      <span className="font-mono-nums text-slate-400">{c.sqft.toLocaleString()} sqft</span>
                      <span className="font-mono-nums text-slate-400">${c.pricePerSqft?.toFixed(0) || Math.round(c.salePrice / c.sqft)}/sqft</span>
                      <span className="text-slate-500">{new Date(c.saleDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop comp table */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="table-header">Address</th>
                      <th className="table-header">Price</th>
                      <th className="table-header">Sqft</th>
                      <th className="table-header">$/Sqft</th>
                      <th className="table-header">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lot.comps.map(c => (
                      <tr key={c.id} className="border-b border-slate-700/50">
                        <td className="table-cell text-slate-200">{c.address}</td>
                        <td className="table-cell font-mono-nums">{formatCurrency(c.salePrice)}</td>
                        <td className="table-cell font-mono-nums">{c.sqft.toLocaleString()}</td>
                        <td className="table-cell font-mono-nums">${c.pricePerSqft?.toFixed(0) || Math.round(c.salePrice / c.sqft)}</td>
                        <td className="table-cell text-slate-400">{new Date(c.saleDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card mt-3 bg-slate-900">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Average $/sqft:</span>
                  <span className="font-mono-nums text-slate-200 font-bold">
                    ${Math.round(lot.comps.reduce((s, c) => s + c.salePrice / c.sqft, 0) / lot.comps.length)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">Est. ARV:</span>
                  <span className="font-mono-nums text-green-400 font-bold">
                    {formatCurrency(lot.comps.reduce((s, c) => s + c.salePrice, 0) / lot.comps.length)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No comps added yet. Add 3 new construction sales within 0.5 miles.</p>
          )}
        </div>
      )}

      {activeTab === 'deal' && (
        <div>
          {lot.deal ? (
            <div className="card bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Active Deal Analysis</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Est. ARV</span><span className="font-mono-nums">{formatCurrency(lot.deal.estimatedArv || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Build Cost</span><span className="font-mono-nums">{formatCurrency(lot.deal.totalBuildCost || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Max Lot Offer</span><span className="font-mono-nums text-green-400 font-bold">{formatCurrency(lot.deal.maxLotOffer || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Wholesale Fee</span><span className="font-mono-nums">{formatCurrency(lot.deal.wholesaleFee || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="capitalize">{lot.deal.status}</span></div>
              </div>
            </div>
          ) : (
            <DealCalculator
              initialArv={lot.comps.length > 0 ? lot.comps.reduce((s: number, c: Comp) => s + c.salePrice, 0) / lot.comps.length : undefined}
              onSave={handleSaveDeal}
            />
          )}
        </div>
      )}
    </div>
  )
}
