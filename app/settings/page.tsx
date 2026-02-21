'use client'
import { useEffect, useState } from 'react'

interface Settings {
  defaultBuildCost: number
  defaultBuildSqft: number
  defaultWholesaleFee: number
  defaultBuilderMargin: number
  arvMultiplier: number
  darkMode: boolean
  neighborhoodScores: string
}

interface BuyBox {
  id: string
  name: string
  zonings: string
  minLotSizeAcres: number
  maxLotSizeAcres: number
  targetZips: string
  maxTaxValue: number
  absenteeOnly: boolean
  isDefault: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [buyBoxes, setBuyBoxes] = useState<BuyBox[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newBuyBox, setNewBuyBox] = useState({ name: '', zonings: 'R3,R4,R5', targetZips: '', maxTaxValue: '100000', minAcres: '0.10', maxAcres: '0.35' })
  const [showNewBuyBox, setShowNewBuyBox] = useState(false)
  const [neighborhoodScores, setNeighborhoodScores] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((s: Settings) => {
      setSettings(s)
      setNeighborhoodScores(JSON.parse(s.neighborhoodScores || '{}'))
    })
    fetch('/api/buybox').then(r => r.json()).then(setBuyBoxes)
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, neighborhoodScores }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateBuyBox = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/buybox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newBuyBox.name,
        zonings: newBuyBox.zonings.split(',').map(s => s.trim()),
        targetZips: newBuyBox.targetZips.split(',').map(s => s.trim()),
        maxTaxValue: parseFloat(newBuyBox.maxTaxValue),
        minLotSizeAcres: parseFloat(newBuyBox.minAcres),
        maxLotSizeAcres: parseFloat(newBuyBox.maxAcres),
      }),
    })
    setShowNewBuyBox(false)
    setNewBuyBox({ name: '', zonings: 'R3,R4,R5', targetZips: '', maxTaxValue: '100000', minAcres: '0.10', maxAcres: '0.35' })
    const res = await fetch('/api/buybox')
    setBuyBoxes(await res.json())
  }

  const handleDeleteBuyBox = async (id: string) => {
    await fetch(`/api/buybox/${id}`, { method: 'DELETE' })
    setBuyBoxes(bb => bb.filter(b => b.id !== id))
  }

  if (!settings) return <div className="text-slate-500">Loading settings...</div>

  const targetZips = ['30310', '30311', '30312', '30314', '30315', '30316', '30317', '30318', '30079', '30032', '30033', '30002']

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500">Configure defaults and buy box criteria</p>
      </div>

      {/* Deal Defaults */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Deal Defaults</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Build Cost ($/sqft)</label>
            <input
              type="number"
              value={settings.defaultBuildCost}
              onChange={e => setSettings(s => s ? { ...s, defaultBuildCost: Number(e.target.value) } : s)}
              className="input w-full font-mono-nums"
            />
          </div>
          <div>
            <label className="label">Build Sqft</label>
            <input
              type="number"
              value={settings.defaultBuildSqft}
              onChange={e => setSettings(s => s ? { ...s, defaultBuildSqft: Number(e.target.value) } : s)}
              className="input w-full font-mono-nums"
            />
          </div>
          <div>
            <label className="label">Wholesale Fee</label>
            <input
              type="number"
              value={settings.defaultWholesaleFee}
              onChange={e => setSettings(s => s ? { ...s, defaultWholesaleFee: Number(e.target.value) } : s)}
              className="input w-full font-mono-nums"
            />
          </div>
          <div>
            <label className="label">Builder Margin</label>
            <input
              type="number"
              step="0.01"
              value={settings.defaultBuilderMargin}
              onChange={e => setSettings(s => s ? { ...s, defaultBuilderMargin: Number(e.target.value) } : s)}
              className="input w-full font-mono-nums"
            />
          </div>
          <div>
            <label className="label">ARV Multiplier</label>
            <input
              type="number"
              step="0.01"
              value={settings.arvMultiplier}
              onChange={e => setSettings(s => s ? { ...s, arvMultiplier: Number(e.target.value) } : s)}
              className="input w-full font-mono-nums"
            />
          </div>
        </div>
      </div>

      {/* Neighborhood Scoring */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Neighborhood Scoring (0-15 bonus points)</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {targetZips.map(zip => (
            <div key={zip}>
              <label className="label">{zip}</label>
              <input
                type="number"
                min="0"
                max="15"
                value={neighborhoodScores[zip] || 0}
                onChange={e => setNeighborhoodScores(ns => ({ ...ns, [zip]: Number(e.target.value) }))}
                className="input w-full font-mono-nums"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Buy Box Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Buy Boxes</h2>
          <button onClick={() => setShowNewBuyBox(true)} className="btn-secondary text-sm">New Buy Box</button>
        </div>

        {showNewBuyBox && (
          <form onSubmit={handleCreateBuyBox} className="bg-slate-900 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Name</label>
                <input value={newBuyBox.name} onChange={e => setNewBuyBox(b => ({ ...b, name: e.target.value }))} className="input w-full" required />
              </div>
              <div>
                <label className="label">Zonings (comma-sep)</label>
                <input value={newBuyBox.zonings} onChange={e => setNewBuyBox(b => ({ ...b, zonings: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Target ZIPs (comma-sep)</label>
                <input value={newBuyBox.targetZips} onChange={e => setNewBuyBox(b => ({ ...b, targetZips: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Max Tax Value</label>
                <input type="number" value={newBuyBox.maxTaxValue} onChange={e => setNewBuyBox(b => ({ ...b, maxTaxValue: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Min Acres</label>
                <input type="number" step="0.01" value={newBuyBox.minAcres} onChange={e => setNewBuyBox(b => ({ ...b, minAcres: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Max Acres</label>
                <input type="number" step="0.01" value={newBuyBox.maxAcres} onChange={e => setNewBuyBox(b => ({ ...b, maxAcres: e.target.value }))} className="input w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">Create</button>
              <button type="button" onClick={() => setShowNewBuyBox(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {buyBoxes.map(bb => (
            <div key={bb.id} className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
              <div>
                <p className="font-medium text-slate-200">{bb.name} {bb.isDefault && <span className="badge bg-green-500/20 text-green-400 ml-2 text-xs">Default</span>}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Zonings: {JSON.parse(bb.zonings).join(', ')} &middot;
                  ZIPs: {JSON.parse(bb.targetZips).slice(0, 4).join(', ')}{JSON.parse(bb.targetZips).length > 4 ? '...' : ''} &middot;
                  {bb.minLotSizeAcres}-{bb.maxLotSizeAcres} ac &middot;
                  Max ${bb.maxTaxValue?.toLocaleString()}
                </p>
              </div>
              {!bb.isDefault && (
                <button onClick={() => handleDeleteBuyBox(bb.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
