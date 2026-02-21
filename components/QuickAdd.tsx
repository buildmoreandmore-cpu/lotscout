'use client'
import { useState } from 'react'

interface Props {
  onComplete: () => void
  onClose: () => void
}

export default function QuickAdd({ onComplete, onClose }: Props) {
  const [form, setForm] = useState({
    parcelId: '', ownerName: '', propertyAddress: '', propertyCity: 'Atlanta',
    propertyZip: '', county: 'Fulton', zoning: 'R4', lotSizeAcres: '',
    taxAssessedValue: '', taxStatus: 'current', taxDelinquentYrs: '0',
    ownerMailAddress: '', ownerMailCity: '', ownerMailState: 'GA', ownerMailZip: '',
    neighborhood: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.parcelId || !form.propertyAddress || !form.propertyZip) return
    setSaving(true)
    await fetch('/api/lots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        lotSizeAcres: form.lotSizeAcres ? parseFloat(form.lotSizeAcres) : null,
        taxAssessedValue: form.taxAssessedValue ? parseFloat(form.taxAssessedValue) : null,
        taxDelinquentYrs: parseInt(form.taxDelinquentYrs) || 0,
      }),
    })
    setSaving(false)
    onComplete()
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-200">Quick Add Lot</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 text-xl leading-none">&times;</button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="label">Parcel ID *</label>
          <input value={form.parcelId} onChange={e => set('parcelId', e.target.value)} className="input w-full" required />
        </div>
        <div>
          <label className="label">Owner Name</label>
          <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Property Address *</label>
          <input value={form.propertyAddress} onChange={e => set('propertyAddress', e.target.value)} className="input w-full" required />
        </div>
        <div>
          <label className="label">City</label>
          <input value={form.propertyCity} onChange={e => set('propertyCity', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">ZIP *</label>
          <input value={form.propertyZip} onChange={e => set('propertyZip', e.target.value)} className="input w-full" required />
        </div>
        <div>
          <label className="label">County</label>
          <select value={form.county} onChange={e => set('county', e.target.value)} className="select w-full">
            <option>Fulton</option><option>DeKalb</option><option>Gwinnett</option><option>Clayton</option><option>Cobb</option>
          </select>
        </div>
        <div>
          <label className="label">Zoning</label>
          <select value={form.zoning} onChange={e => set('zoning', e.target.value)} className="select w-full">
            <option>R1</option><option>R2</option><option>R3</option><option>R4</option><option>R5</option><option>MR</option>
          </select>
        </div>
        <div>
          <label className="label">Lot Size (acres)</label>
          <input type="number" step="0.01" value={form.lotSizeAcres} onChange={e => set('lotSizeAcres', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Tax Assessed Value</label>
          <input type="number" value={form.taxAssessedValue} onChange={e => set('taxAssessedValue', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Tax Status</label>
          <select value={form.taxStatus} onChange={e => set('taxStatus', e.target.value)} className="select w-full">
            <option value="current">Current</option><option value="delinquent">Delinquent</option>
          </select>
        </div>
        <div>
          <label className="label">Yrs Delinquent</label>
          <input type="number" value={form.taxDelinquentYrs} onChange={e => set('taxDelinquentYrs', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Neighborhood</label>
          <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className="input w-full" />
        </div>
        <div className="col-span-full border-t border-slate-700 pt-3 mt-1">
          <p className="text-xs text-slate-500 mb-2">Owner mailing address (if different = absentee)</p>
        </div>
        <div>
          <label className="label">Mail Address</label>
          <input value={form.ownerMailAddress} onChange={e => set('ownerMailAddress', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Mail City</label>
          <input value={form.ownerMailCity} onChange={e => set('ownerMailCity', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">Mail ZIP</label>
          <input value={form.ownerMailZip} onChange={e => set('ownerMailZip', e.target.value)} className="input w-full" />
        </div>
        <div className="col-span-full">
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input w-full" rows={2} />
        </div>
        <div className="col-span-full flex flex-col sm:flex-row gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Add Lot'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none">Cancel</button>
        </div>
      </form>
    </div>
  )
}
