/**
 * Minimal ArcGIS REST query helper with pagination.
 */

interface QueryOpts {
  where: string
  outFields: string
  orderBy?: string
  pageSize?: number
}

/** Fetch every matching feature's `attributes`, paging until the server is exhausted. */
export async function fetchArcgisAll(endpoint: string, opts: QueryOpts): Promise<any[]> {
  const pageSize = opts.pageSize ?? 1000
  const all: any[] = []
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      where: opts.where,
      outFields: opts.outFields,
      f: 'json',
      returnGeometry: 'false',
      resultRecordCount: String(pageSize),
      resultOffset: String(offset),
    })
    if (opts.orderBy) params.set('orderByFields', opts.orderBy)

    const res = await fetch(`${endpoint}?${params}`)
    const data = await res.json()
    if (data.error) {
      throw new Error(`ArcGIS error from ${endpoint}: ${JSON.stringify(data.error).slice(0, 300)}`)
    }

    const feats: any[] = data.features || []
    all.push(...feats.map((f: any) => f.attributes))

    if (feats.length === 0) break
    offset += feats.length
    // Stop only when the server says there's no more (or returned a short page
    // that wasn't truncated by its own transfer limit).
    if (data.exceededTransferLimit !== true && feats.length < pageSize) break
    if (offset > 100_000) break // safety backstop
    process.stdout.write(`\r    fetched ${all.length}...`)
  }
  if (all.length > pageSize) process.stdout.write('\n')
  return all
}

/** Server-side count for a where clause (cheap pre-check). */
export async function fetchArcgisCount(endpoint: string, where: string): Promise<number> {
  const params = new URLSearchParams({ where, returnCountOnly: 'true', f: 'json' })
  const res = await fetch(`${endpoint}?${params}`)
  const data = await res.json()
  return data.count ?? 0
}
