/**
 * County integrations for the LotScout scanner.
 *
 * Each block was built from a LIVE-verified ArcGIS REST endpoint + real sample
 * features (field names differ per county). To add a county, copy a block,
 * swap the endpoint / field names / where clause, and verify with:
 *   curl "<endpoint>?where=1=1&outFields=*&resultRecordCount=2&f=json&returnGeometry=false"
 */
import { CountyConfig, NormalizedLot } from './lib/types'
import { fetchArcgisAll } from './lib/arcgis'

const SKIP_OWNERS = [
  'CITY OF', 'COUNTY OF', 'FULTON COUNTY', 'DEKALB COUNTY', 'GWINNETT COUNTY',
  'FORSYTH COUNTY', 'PAULDING COUNTY', 'JACKSON COUNTY', 'STATE OF GEORGIA',
  'STATE HIGHWAY', 'DEPARTMENT OF', 'BOARD OF EDUCATION', 'UNITED STATES',
  'GEORGIA POWER', 'MARTA', 'HOMEOWNERS ASSOC', 'HOMEOWNER ASSOC', 'HOA',
  'COMMUNITY ASSOC', 'COMMUNITY ASSN', 'ASSOCIATION', ' ASSN', 'CONDOMINIUM',
  'CONDO ASSOC', 'CHURCH', 'AUTHORITY',
]

function isSkippedOwner(name: string | null | undefined): boolean {
  const u = (name || '').toUpperCase()
  if (!u.trim()) return false
  return SKIP_OWNERS.some(s => u.includes(s))
}

function num(v: any): number | null {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Normalize a city to Title Case (county GIS layers often store ALL CAPS). */
function titleCase(s: string | null | undefined): string | null {
  if (!s) return null
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim() || null
}

// ───────────────────────── GWINNETT (Dacula 30019) ─────────────────────────
// services3.arcgis.com hosted "Tax Master Table" — every lead field in one layer.
// Values & acreage are space-padded STRINGS; CAST() works server-side.
const gwinnett: CountyConfig = {
  name: 'Gwinnett',
  key: 'gwinnett',
  endpoint:
    'https://services3.arcgis.com/RfpmnkSAQleRbndX/arcgis/rest/services/Property_and_Tax/FeatureServer/3/query',
  outFields:
    'PIN,OWNER1,OWNER2,MAILADDR,MAILCITY,MAILSTAT,MAILZIP,LOCADDR,LOCCITY,LOCZIP,ZONING,ZONEDESC,LEGALAC,PROPCLAS,PCDESC,TOTVAL1,LANDVAL1',
  where:
    "LOCZIP='30019' AND PCDESC LIKE '%Vacant%' AND CAST(LEGALAC AS FLOAT)>=0.10 AND CAST(LEGALAC AS FLOAT)<=3",
  zipScores: { '30019': 10 },
  basePremium: 6,
  minScore: 40,
  mapRow(a): NormalizedLot | null {
    if (isSkippedOwner(a.OWNER1)) return null
    return {
      parcelId: String(a.PIN).trim(),
      ownerName: (a.OWNER1 || '').trim() || null,
      ownerMailAddress: (a.MAILADDR || '').trim() || null,
      ownerMailCity: a.MAILCITY || null,
      ownerMailState: a.MAILSTAT || null,
      ownerMailZip: (a.MAILZIP || '').slice(0, 5) || null,
      propertyAddress: (a.LOCADDR || '').trim() || `Parcel ${String(a.PIN).trim()}`,
      propertyCity: titleCase(a.LOCCITY) || 'Dacula',
      propertyState: 'GA',
      propertyZip: a.LOCZIP || '30019',
      county: 'Gwinnett',
      zoning: a.ZONING || null,
      propertyClass: a.PCDESC || null,
      lotSizeAcres: num(a.LEGALAC),
      taxAssessedValue: num(a.TOTVAL1),
      neighborhood: a.ZONEDESC || null,
    }
  },
}

// ───────────────────────── JACKSON (Braselton 30517) ───────────────────────
// services8.arcgis.com Tax_Parcels layer 9. DIGCLASS='V' = vacant. Rural → wide
// acreage band. No zoning field; value = FMVRES+FMVCOM+FMVACC.
const jackson: CountyConfig = {
  name: 'Jackson',
  key: 'jackson',
  endpoint:
    'https://services8.arcgis.com/bcbi4lYRFOsss0F5/arcgis/rest/services/Tax_Parcels/FeatureServer/9/query',
  outFields:
    'PARCEL_NO,HOUSE_NO,STREET_NAM,LASTNAME,ADDRESS1,ADDRESS2,ADDRESS3,CITY,STATE,ZIP,TOTALACRES,FMVRES,FMVCOM,FMVACC,DIGCLASS,LEGAL_DESC',
  where: "ZIP='30517' AND DIGCLASS='V' AND TOTALACRES>=0.10 AND TOTALACRES<=25",
  zipScores: { '30517': 8 },
  basePremium: 6,
  minScore: 40,
  pageSize: 2000,
  mapRow(a): NormalizedLot | null {
    if (isSkippedOwner(a.LASTNAME)) return null
    const house = a.HOUSE_NO != null && String(a.HOUSE_NO).trim() !== '' ? `${a.HOUSE_NO} ` : ''
    const addr = `${house}${a.STREET_NAM || ''}`.trim()
    const mail = [a.ADDRESS1, a.ADDRESS2, a.ADDRESS3]
      .map(x => (x || '').trim())
      .filter(Boolean)
      .join(' ')
    const value = (num(a.FMVRES) || 0) + (num(a.FMVCOM) || 0) + (num(a.FMVACC) || 0)
    return {
      parcelId: String(a.PARCEL_NO).trim(),
      ownerName: (a.LASTNAME || '').trim() || null,
      ownerMailAddress: mail || null,
      ownerMailCity: a.CITY || null,
      ownerMailState: a.STATE || null,
      ownerMailZip: null, // layer has no separate mailing ZIP
      propertyAddress: addr || `Parcel ${String(a.PARCEL_NO).trim()}`,
      propertyCity: 'Braselton',
      propertyState: 'GA',
      propertyZip: a.ZIP || '30517',
      county: 'Jackson',
      zoning: null,
      propertyClass: a.DIGCLASS || null,
      lotSizeAcres: num(a.TOTALACRES),
      taxAssessedValue: value,
      neighborhood: null,
    }
  },
}

// ───────────────────────── FORSYTH (Cumming 30040/41/28) ────────────────────
// geo.forsythco.com Tax_Parcel layer 0 has everything EXCEPT owner name, which
// lives on the EnerGov layer (joined by PARCELID in `enrich`). Vacant = no
// building (BLDGAREA IS NULL). Only a mailing ZIP exists, used as property ZIP.
const FORSYTH_OWNER_ENDPOINT =
  'https://geo.forsythco.com/gis/rest/services/EnerGov/EnerGovParcelAddressMapService/MapServer/1/query'

const forsyth: CountyConfig = {
  name: 'Forsyth',
  key: 'forsyth',
  endpoint: 'https://geo.forsythco.com/gis/rest/services/Public/Tax_Parcel/MapServer/0/query',
  outFields:
    'PARCELID,SITEADDRESS,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5,STATEDAREA,CNTASSDVAL,ZONING,CLASSCD,CLASSDSCRP,USECD,USEDSCRP',
  where:
    "PSTLZIP5 IN ('30040','30041','30028') AND STATEDAREA>=0.10 AND STATEDAREA<=3 AND CNTASSDVAL<150000 AND BLDGAREA IS NULL",
  zipScores: { '30040': 9, '30041': 8, '30028': 8 },
  basePremium: 6,
  minScore: 40,
  mapRow(a): NormalizedLot | null {
    const zip = (a.PSTLZIP5 || '').slice(0, 5)
    return {
      parcelId: String(a.PARCELID).trim(),
      ownerName: null, // filled by enrich()
      ownerMailAddress: (a.PSTLADDRESS || '').trim() || null,
      ownerMailCity: a.PSTLCITY || null,
      ownerMailState: a.PSTLSTATE || null,
      ownerMailZip: zip || null,
      propertyAddress: (a.SITEADDRESS || '').trim() || `Parcel ${String(a.PARCELID).trim()}`,
      propertyCity: 'Cumming',
      propertyState: 'GA',
      // NOTE: Forsyth's layer exposes only a mailing ZIP. For owner-occupied
      // parcels this equals the site ZIP; for absentee owners it's approximate.
      propertyZip: zip || '30040',
      county: 'Forsyth',
      zoning: a.ZONING || null,
      propertyClass: a.CLASSDSCRP || a.USEDSCRP || null,
      lotSizeAcres: num(a.STATEDAREA),
      taxAssessedValue: num(a.CNTASSDVAL),
      neighborhood: a.USEDSCRP || null,
    }
  },
  async enrich(rows): Promise<void> {
    const byId = new Map(rows.map(r => [r.parcelId, r]))
    const ids = Array.from(byId.keys())
    for (let i = 0; i < ids.length; i += 80) {
      const batch = ids.slice(i, i + 80)
      const inList = batch.map(id => `'${id.replace(/'/g, "''")}'`).join(',')
      try {
        const feats = await fetchArcgisAll(FORSYTH_OWNER_ENDPOINT, {
          where: `PARCELID IN (${inList})`,
          outFields: 'PARCELID,OWNERNME1,OWNERNME2',
          pageSize: 1000,
        })
        for (const f of feats) {
          const lot = byId.get(String(f.PARCELID).trim())
          if (lot) lot.ownerName = (f.OWNERNME1 || f.OWNERNME2 || '').trim() || null
        }
      } catch (err) {
        console.error(`  ⚠️ Forsyth owner join batch failed: ${err instanceof Error ? err.message : err}`)
      }
    }
    // Drop government/HOA owners now that names are known.
    const kept = Array.from(byId.values()).filter(lot => !isSkippedOwner(lot.ownerName))
    rows.length = 0
    rows.push(...kept)
  },
}

// ───────────────────────── PAULDING (Dallas 30132/30157) ────────────────────
// DEGRADED: Paulding's public ArcGIS exposes only parcel geometry + acreage +
// tax district. Owner name, mailing address, assessed value, and site address
// are NOT published via REST (qpublic/Schneider only). Scanned & reported but
// not inserted unless `--force`, since rows would lack the fields scoring needs.
// TaxDist 1100 = Dallas.
const paulding: CountyConfig = {
  name: 'Paulding',
  key: 'paulding',
  degraded: true,
  endpoint:
    'https://services8.arcgis.com/7YXQzPPGs9Uc4qKl/arcgis/rest/services/Paulding_Map_Auto_Updated_WFL1/FeatureServer/25/query',
  outFields: 'GPIN,DeedAc,CalcAc,TaxDist,SubdivID,OWNKEY',
  where: 'TaxDist=1100 AND DeedAc>=0.10 AND DeedAc<=25',
  basePremium: 4,
  minScore: 0,
  mapRow(a): NormalizedLot | null {
    const acres = num(a.DeedAc) || num(a.CalcAc)
    return {
      parcelId: String(a.GPIN).trim(),
      ownerName: null,
      ownerMailAddress: null,
      ownerMailCity: null,
      ownerMailState: 'GA',
      ownerMailZip: null,
      propertyAddress: `Parcel ${String(a.GPIN).trim()}`, // no site address in REST
      propertyCity: 'Dallas',
      propertyState: 'GA',
      propertyZip: '30132',
      county: 'Paulding',
      zoning: null,
      propertyClass: null,
      lotSizeAcres: acres,
      taxAssessedValue: null,
      neighborhood: `TaxDist ${a.TaxDist}`,
    }
  },
}

// ───────────────────────── FULTON (SW Atlanta) ─────────────────────────────
// Existing integration, refactored into the engine. 2018 ArcGIS layer has no
// ZIP — historically defaulted to 30310 (a known limitation).
const fulton: CountyConfig = {
  name: 'Fulton',
  key: 'fulton',
  endpoint:
    'https://services1.arcgis.com/AQDHTHDrZzfsFsB5/arcgis/rest/services/Tax_Parcels2018/FeatureServer/0/query',
  outFields:
    'ParcelID,Address,Owner,OwnerAddr1,LandAcres,TotAssess,ImprAssess,ClassCode,NbrHood,Subdiv',
  where:
    "ImprAssess=0 AND LandAcres>=0.10 AND LandAcres<=0.35 AND TotAssess<100000 AND (ClassCode='R3' OR ClassCode='R4' OR ClassCode='R5')",
  orderBy: 'TotAssess ASC',
  basePremium: 10,
  minScore: 40,
  mapRow(a): NormalizedLot | null {
    if (isSkippedOwner(a.Owner)) return null
    return {
      parcelId: String(a.ParcelID).trim(),
      ownerName: (a.Owner || '').trim() || null,
      ownerMailAddress: (a.OwnerAddr1 || '').trim() || null,
      ownerMailCity: null,
      ownerMailState: 'GA',
      ownerMailZip: null,
      propertyAddress: (a.Address || '').trim() || `Parcel ${String(a.ParcelID).trim()}`,
      propertyCity: 'Atlanta',
      propertyState: 'GA',
      propertyZip: '30310', // 2018 layer has no ZIP; refine per neighborhood later
      county: 'Fulton',
      zoning: a.ClassCode || null,
      propertyClass: a.ClassCode || null,
      lotSizeAcres: num(a.LandAcres),
      taxAssessedValue: num(a.TotAssess),
      neighborhood: a.Subdiv || a.NbrHood || null,
    }
  },
}

// ───────────────────────── DEKALB (Decatur corridor) ───────────────────────
const dekalb: CountyConfig = {
  name: 'DeKalb',
  key: 'dekalb',
  endpoint: 'https://dcgis.dekalbcountyga.gov/mapping/rest/services/TaxParcels/MapServer/0/query',
  outFields:
    'PARCELID,OWNERNME1,SITEADDRESS,CITY,ZIP,ZONING,ACREAGE,CNTASSDVAL,CLASSDSCRP,LANDUSE,PSTLADDRESS,PSTLCITY,PSTLSTATE,PSTLZIP5',
  where:
    "ZIP IN ('30032','30033','30079') AND ACREAGE>=0.10 AND ACREAGE<=0.35 AND CNTASSDVAL<100000",
  orderBy: 'CNTASSDVAL ASC',
  zipScores: { '30079': 10, '30032': 9, '30033': 11 },
  minScore: 40,
  pageSize: 2000,
  mapRow(a): NormalizedLot | null {
    if (isSkippedOwner(a.OWNERNME1)) return null
    const z = (a.ZONING || '').toUpperCase()
    if (!/^R-|^MR-/.test(z)) return null // residential zoning only
    return {
      parcelId: String(a.PARCELID).trim(),
      ownerName: (a.OWNERNME1 || '').trim() || null,
      ownerMailAddress: (a.PSTLADDRESS || '').trim() || null,
      ownerMailCity: a.PSTLCITY || null,
      ownerMailState: a.PSTLSTATE || 'GA',
      ownerMailZip: (a.PSTLZIP5 || '').slice(0, 5) || null,
      propertyAddress: (a.SITEADDRESS || '').trim() || `Parcel ${String(a.PARCELID).trim()}`,
      propertyCity: titleCase(a.CITY) || 'Decatur',
      propertyState: 'GA',
      propertyZip: a.ZIP,
      county: 'DeKalb',
      zoning: a.ZONING || null,
      propertyClass: a.CLASSDSCRP || null,
      lotSizeAcres: num(a.ACREAGE),
      taxAssessedValue: num(a.CNTASSDVAL),
      neighborhood: a.LANDUSE || null,
    }
  },
}

export const COUNTIES: CountyConfig[] = [
  gwinnett,
  jackson,
  forsyth,
  paulding,
  fulton,
  dekalb,
]

/**
 * Default target when no county is specified. Paulding is intentionally
 * excluded: its public ArcGIS has no owner/value/address, and the only sources
 * that do (qpublic, ReportAllUSA) are Cloudflare-gated / paid. Run it explicitly
 * with `scout -- paulding` (scan-only) if needed.
 */
export const NEW_COUNTY_KEYS = ['gwinnett', 'jackson', 'forsyth']
