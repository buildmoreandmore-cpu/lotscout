/**
 * Shared types for the county-scanner engine.
 */

/** A parcel normalized to LotScout's `lots` schema, county-agnostic. */
export interface NormalizedLot {
  parcelId: string
  ownerName: string | null
  ownerMailAddress: string | null
  ownerMailCity: string | null
  ownerMailState: string | null
  ownerMailZip: string | null
  propertyAddress: string
  propertyCity: string | null
  propertyState: string
  propertyZip: string
  county: string
  zoning: string | null
  propertyClass: string | null
  lotSizeAcres: number | null
  taxAssessedValue: number | null
  neighborhood: string | null
  // Derived by the engine before insert:
  isAbsenteeOwner?: boolean
  leadScore?: number
}

/**
 * One county integration. The shared engine handles pagination, scoring,
 * dedupe, and insert — each config only describes that county's quirks.
 */
export interface CountyConfig {
  /** Display name, also stored as `county` on rows. */
  name: string
  /** CLI key, e.g. `forsyth`. */
  key: string
  /** ArcGIS REST `.../query` endpoint. */
  endpoint: string
  /** Comma-separated outFields (or `*`). */
  outFields: string
  /** SQL `where` clause selecting candidate vacant parcels. */
  where: string
  /** Optional server-side sort. */
  orderBy?: string
  /** Page size; some servers cap this server-side (we honor exceededTransferLimit). */
  pageSize?: number
  /** Map one raw ArcGIS `attributes` object to a NormalizedLot, or null to drop it. */
  mapRow: (attr: any) => NormalizedLot | null
  /** Optional second pass (e.g. join a separate layer for owner names). */
  enrich?: (rows: NormalizedLot[]) => Promise<void>
  /** Per-ZIP score bonus (capped at 15). */
  zipScores?: Record<string, number>
  /** Flat regional premium added to every lot's score. */
  basePremium?: number
  /** Minimum score to qualify as a lead. Default 40. */
  minScore?: number
  /**
   * True when this county's public ArcGIS omits owner/value/address.
   * The engine will scan + report but refuse to insert (would pollute the DB)
   * unless `--force` is passed.
   */
  degraded?: boolean
}
