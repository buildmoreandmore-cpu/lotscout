'use client'
import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/calculations'
import FileUpload from '@/components/FileUpload'
import QuickAdd from '@/components/QuickAdd'
import LotDetail from '@/components/LotDetail'
import MapView from '@/components/MapView'

interface Lot {
  id: string
  parcelId: string
  ownerName: string
  propertyAddress: string
  propertyZip: string
  county: string
  zoning: string | null
  lotSizeAcres: number | null
  taxAssessedValue: number | null
  taxStatus: string
  taxDelinquentYrs: number
  isAbsenteeOwner: boolean
  leadScore: number
  leadStatus: string
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  isSample: boolean
  contacts: any[]
  comps: any[]
  deal: any
}

interface BuyBox {
  id: string
  name: string
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [buyBoxId, setBuyBoxId] = useState('')
  const [buyBoxes, setBuyBoxes] = useState<BuyBox[]>([])
  const [sortBy, setSortBy] = useState('leadScore')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedLot, setSelectedLot] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchLots = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (buyBoxId) params.set('buybox', buyBoxId)
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
    params.set('page', String(page))
    params.set('limit', '50')
    const res = await fetch(`/api/lots?${params}`)
    const data = await res.json()
    setLots(data.lots)
    setTotal(data.total)
    setPages(data.pages)
    setLoading(false)
  }, [search, status, buyBoxId, sortBy, sortDir, page])

  useEffect(() => { fetchLots() }, [fetchLots])
  useEffect(() => { fetch('/api/buybox').then(r => r.json()).then(setBuyBoxes) }, [])

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleExport = async () => {
    const params = new URLSearchParams()
    if (buyBoxId) params.set('buybox', buyBoxId)
    if (status !== 'all') params.set('status', status)
    const res = await fetch(`/api/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lotscout-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: string }) => (
    sortBy === col ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null
  )

  if (selectedLot) {
    return <LotDetail lotId={selectedLot} onBack={() => { setSelectedLot(null); fetchLots() }} />
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Lots</h1>
          <p className="text-xs md:text-sm text-slate-500">{total} lots found</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button onClick={() => setShowMap(!showMap)} className="btn-secondary text-sm">
            {showMap ? 'Table' : 'Map'}
          </button>
          <button onClick={() => setShowQuickAdd(true)} className="btn-secondary text-sm">Quick Add</button>
          <button onClick={() => setShowUpload(true)} className="btn-secondary text-sm">Upload</button>
          <button onClick={handleExport} className="btn-secondary text-sm">Export</button>
        </div>
      </div>

      {showUpload && <FileUpload onComplete={() => { setShowUpload(false); fetchLots() }} onClose={() => setShowUpload(false)} />}
      {showQuickAdd && <QuickAdd onComplete={() => { setShowQuickAdd(false); fetchLots() }} onClose={() => setShowQuickAdd(false)} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search owner, address, parcel..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="select">
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="under_contract">Under Contract</option>
            <option value="closed">Closed</option>
            <option value="dead">Dead</option>
          </select>
          <select value={buyBoxId} onChange={e => { setBuyBoxId(e.target.value); setPage(1) }} className="select">
            <option value="">All Buy Boxes</option>
            {buyBoxes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {showMap ? (
        <div className="card p-0 overflow-hidden h-[50vh] md:h-[600px]">
          <MapView lots={lots} onSelectLot={setSelectedLot} />
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : lots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No lots found</div>
            ) : lots.map(lot => (
              <div
                key={lot.id}
                onClick={() => setSelectedLot(lot.id)}
                className="card cursor-pointer active:bg-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200 text-sm truncate">{lot.propertyAddress}</p>
                      {lot.isSample && <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">SAMPLE</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{lot.ownerName}</p>
                  </div>
                  <span className={`badge font-mono-nums shrink-0 ${lot.leadScore >= 75 ? 'score-green' : lot.leadScore >= 50 ? 'score-yellow' : 'score-red'}`}>
                    {lot.leadScore}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-mono-nums">{lot.propertyZip}</span>
                  {lot.zoning && <span className="badge bg-slate-700 text-slate-300 text-xs">{lot.zoning}</span>}
                  {lot.lotSizeAcres && <span className="text-xs text-slate-400 font-mono-nums">{lot.lotSizeAcres.toFixed(2)} ac</span>}
                  {lot.taxAssessedValue && <span className="text-xs text-slate-400 font-mono-nums">{formatCurrency(lot.taxAssessedValue)}</span>}
                  {lot.taxStatus === 'delinquent' && <span className="badge bg-red-500/20 text-red-400 text-xs">{lot.taxDelinquentYrs}yr</span>}
                  {lot.isAbsenteeOwner && <span className="badge bg-purple-500/20 text-purple-400 text-xs">Absentee</span>}
                  <span className={`badge status-${lot.leadStatus} text-xs capitalize`}>{lot.leadStatus.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('leadScore')}>
                    Score<SortIcon col="leadScore" />
                  </th>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('propertyAddress')}>
                    Address<SortIcon col="propertyAddress" />
                  </th>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('ownerName')}>
                    Owner<SortIcon col="ownerName" />
                  </th>
                  <th className="table-header">ZIP</th>
                  <th className="table-header">Zoning</th>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('lotSizeAcres')}>
                    Acres<SortIcon col="lotSizeAcres" />
                  </th>
                  <th className="table-header cursor-pointer" onClick={() => handleSort('taxAssessedValue')}>
                    Tax Value<SortIcon col="taxAssessedValue" />
                  </th>
                  <th className="table-header">Tax</th>
                  <th className="table-header">Flags</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading...</td></tr>
                ) : lots.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">No lots found</td></tr>
                ) : lots.map(lot => (
                  <tr
                    key={lot.id}
                    onClick={() => setSelectedLot(lot.id)}
                    className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="table-cell">
                      <span className={`badge font-mono-nums ${lot.leadScore >= 75 ? 'score-green' : lot.leadScore >= 50 ? 'score-yellow' : 'score-red'}`}>
                        {lot.leadScore}
                      </span>
                    </td>
                    <td className="table-cell font-medium text-slate-200 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{lot.propertyAddress}</span>
                        {lot.isSample && <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">SAMPLE</span>}
                      </div>
                    </td>
                    <td className="table-cell text-slate-300 max-w-[150px] truncate">{lot.ownerName}</td>
                    <td className="table-cell font-mono-nums text-slate-400">{lot.propertyZip}</td>
                    <td className="table-cell">
                      <span className="badge bg-slate-700 text-slate-300">{lot.zoning || '—'}</span>
                    </td>
                    <td className="table-cell font-mono-nums text-slate-300">{lot.lotSizeAcres?.toFixed(2) || '—'}</td>
                    <td className="table-cell font-mono-nums text-slate-300">{lot.taxAssessedValue ? formatCurrency(lot.taxAssessedValue) : '—'}</td>
                    <td className="table-cell">
                      {lot.taxStatus === 'delinquent' ? (
                        <span className="badge bg-red-500/20 text-red-400">{lot.taxDelinquentYrs}yr</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Current</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {lot.isAbsenteeOwner && <span className="badge bg-purple-500/20 text-purple-400 text-xs">Absentee</span>}
                    </td>
                    <td className="table-cell">
                      <span className={`badge status-${lot.leadStatus} text-xs capitalize`}>
                        {lot.leadStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-slate-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary text-sm disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
