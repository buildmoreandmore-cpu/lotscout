'use client'
import { useEffect, useRef } from 'react'

interface Lot {
  id: string
  propertyAddress: string
  leadScore: number
  latitude: number | null
  longitude: number | null
  ownerName: string
  zoning: string | null
  lotSizeAcres: number | null
  taxAssessedValue: number | null
  leadStatus: string
}

interface Props {
  lots: Lot[]
  onSelectLot: (id: string) => void
}

export default function MapView({ lots, onSelectLot }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([33.749, -84.388], 12)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const getColor = (score: number) => {
        if (score >= 75) return '#22c55e'
        if (score >= 50) return '#eab308'
        return '#ef4444'
      }

      lots.forEach(lot => {
        if (!lot.latitude || !lot.longitude) return

        const marker = L.circleMarker([lot.latitude, lot.longitude], {
          radius: 8,
          fillColor: getColor(lot.leadScore),
          color: '#1e293b',
          weight: 2,
          fillOpacity: 0.8,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: system-ui; font-size: 13px; min-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${lot.propertyAddress}</div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">${lot.ownerName}</div>
            <div style="display: flex; gap: 8px; font-size: 12px;">
              <span style="background: ${getColor(lot.leadScore)}22; color: ${getColor(lot.leadScore)}; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">
                Score: ${lot.leadScore}
              </span>
              <span>${lot.zoning || '—'}</span>
              <span>${lot.lotSizeAcres?.toFixed(2) || '—'} ac</span>
            </div>
            <div style="margin-top: 8px;">
              <button onclick="window.__lotscoutSelect('${lot.id}')" style="background: #22c55e; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                View Details
              </button>
            </div>
          </div>
        `)
      })

      // Fit bounds if we have lots with coordinates
      const validLots = lots.filter(l => l.latitude && l.longitude)
      if (validLots.length > 0) {
        const bounds = L.latLngBounds(validLots.map(l => [l.latitude!, l.longitude!] as [number, number]))
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    // Global handler for popup button clicks
    (window as any).__lotscoutSelect = (id: string) => onSelectLot(id)

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      delete (window as any).__lotscoutSelect
    }
  }, [lots, onSelectLot])

  return <div ref={mapRef} className="w-full h-full" />
}
