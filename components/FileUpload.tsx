'use client'
import { useState, useRef } from 'react'

interface Props {
  onComplete: () => void
  onClose: () => void
}

export default function FileUpload({ onComplete, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return
    setStatus('parsing')

    try {
      let rows: any[] = []
      const text = await file.text()

      if (file.name.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        rows = parsed.data
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(text, { type: 'string' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(sheet)
      } else {
        setStatus('error')
        return
      }

      setStatus('uploading')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (e) {
      setStatus('error')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-200">Upload CSV / Excel</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 text-xl leading-none">&times;</button>
      </div>

      {status === 'done' && result ? (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 md:p-4">
            <p className="text-green-400 font-medium">Import Complete</p>
            <p className="text-sm text-slate-300 mt-1">
              {result.imported} imported, {result.skipped} skipped of {result.total} rows
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 md:p-4">
              <p className="text-red-400 font-medium text-sm">Errors:</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-300">{e}</p>)}
            </div>
          )}
          <button onClick={onComplete} className="btn-primary w-full">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-lg p-4 md:p-8 text-center cursor-pointer hover:border-green-500/50 active:border-green-500/70 transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {file ? (
              <p className="text-slate-200 text-sm truncate">{file.name} <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span></p>
            ) : (
              <>
                <p className="text-slate-400 text-sm">Tap to select a CSV or Excel file</p>
                <p className="text-xs text-slate-600 mt-1">Supports county tax assessor exports</p>
              </>
            )}
          </div>

          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-400 mb-1">Supported columns:</p>
            <p>Parcel ID, Owner Name, Property Address, ZIP, County, Zoning, Lot Size, Tax Value, Tax Status, Sale Date/Price, Year Built, Neighborhood</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleUpload}
              disabled={!file || status === 'parsing' || status === 'uploading'}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {status === 'parsing' ? 'Parsing...' : status === 'uploading' ? 'Importing...' : 'Upload & Import'}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1 sm:flex-none">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
