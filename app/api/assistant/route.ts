import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MINIMAX_API = 'https://api.minimax.io/v1/chat/completions'
const MINIMAX_KEY = process.env.MINIMAX_API_KEY || 'sk-api-UQ3nXuR7dKCbSCWY5K8IB2kSmBl7jTNy6jLffMeSyYGNvONc'

async function getContext(query: string) {
  const q = query.toLowerCase()

  // Stats
  const { count: totalLots } = await supabase.from('lots').select('*', { count: 'exact', head: true })
  const { count: absenteeCount } = await supabase.from('lots').select('*', { count: 'exact', head: true }).eq('is_absentee_owner', true)
  const { count: fultonCount } = await supabase.from('lots').select('*', { count: 'exact', head: true }).eq('county', 'Fulton')
  const { count: dekalbCount } = await supabase.from('lots').select('*', { count: 'exact', head: true }).eq('county', 'DeKalb')

  let context = `Database: ${totalLots} total lots (${fultonCount} Fulton, ${dekalbCount} DeKalb). ${absenteeCount} absentee owners.\n`

  // If asking about top/best lots
  if (q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('recommend')) {
    const { data: topLots } = await supabase.from('lots').select('*')
      .gte('lead_score', 70)
      .order('lead_score', { ascending: false })
      .limit(10)
    context += `\nTop 10 lots by score:\n`
    for (const l of topLots || []) {
      context += `- Score ${l.lead_score}: ${l.property_address}, ${l.property_zip} (${l.county}) | ${l.lot_size_acres}ac | $${l.tax_assessed_value} assessed | ${l.zoning} | Owner: ${l.owner_name} | Absentee: ${l.is_absentee_owner}\n`
    }
  }

  // If asking about specific zip
  const zipMatch = q.match(/\b(30\d{3})\b/)
  if (zipMatch) {
    const zip = zipMatch[1]
    const { data: zipLots, count: zipCount } = await supabase.from('lots').select('*', { count: 'exact' })
      .eq('property_zip', zip)
      .order('lead_score', { ascending: false })
      .limit(5)
    context += `\nZIP ${zip}: ${zipCount} lots. Top 5:\n`
    for (const l of zipLots || []) {
      context += `- Score ${l.lead_score}: ${l.property_address} | ${l.lot_size_acres}ac | $${l.tax_assessed_value} | ${l.zoning} | ${l.owner_name} ${l.is_absentee_owner ? '(ABSENTEE)' : ''}\n`
    }
  }

  // If asking about absentee
  if (q.includes('absentee')) {
    const { data: absenteeLots } = await supabase.from('lots').select('*')
      .eq('is_absentee_owner', true)
      .order('lead_score', { ascending: false })
      .limit(10)
    context += `\nTop 10 absentee-owned lots:\n`
    for (const l of absenteeLots || []) {
      context += `- Score ${l.lead_score}: ${l.property_address}, ${l.property_zip} | ${l.lot_size_acres}ac | $${l.tax_assessed_value} | Owner: ${l.owner_name} → mailing: ${l.owner_mail_city} ${l.owner_mail_state}\n`
    }
  }

  // If asking about cheap/low value
  if (q.includes('cheap') || q.includes('low value') || q.includes('zero') || q.includes('$0')) {
    const { data: cheapLots } = await supabase.from('lots').select('*')
      .lte('tax_assessed_value', 5000)
      .order('lead_score', { ascending: false })
      .limit(10)
    context += `\nTop 10 lowest assessed value lots ($0-$5K):\n`
    for (const l of cheapLots || []) {
      context += `- Score ${l.lead_score}: ${l.property_address}, ${l.property_zip} | ${l.lot_size_acres}ac | $${l.tax_assessed_value} | ${l.owner_name} ${l.is_absentee_owner ? '(ABSENTEE)' : ''}\n`
    }
  }

  // If asking about specific address or owner
  if (q.includes('address') || q.includes('owner') || q.includes('who owns')) {
    const searchTerm = q.replace(/who owns|find|search|address|owner|lot/gi, '').trim()
    if (searchTerm.length > 2) {
      const { data: found } = await supabase.from('lots').select('*')
        .or(`property_address.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%`)
        .limit(5)
      if (found && found.length > 0) {
        context += `\nSearch results for "${searchTerm}":\n`
        for (const l of found) {
          context += `- ${l.property_address}, ${l.property_zip} | Owner: ${l.owner_name} | Score: ${l.lead_score} | ${l.lot_size_acres}ac | $${l.tax_assessed_value} | ${l.zoning} | Absentee: ${l.is_absentee_owner}\n`
        }
      }
    }
  }

  // If asking about zoning
  if (q.includes('zoning') || q.includes('mr-2') || q.includes('r-75') || q.includes('r-100')) {
    const zoningMatch = q.match(/(mr-2|r-\d+)/i)
    if (zoningMatch) {
      const zoning = zoningMatch[1].toUpperCase()
      const { data: zonedLots, count } = await supabase.from('lots').select('*', { count: 'exact' })
        .eq('zoning', zoning)
        .order('lead_score', { ascending: false })
        .limit(5)
      context += `\n${zoning} zoning: ${count} lots. Top 5:\n`
      for (const l of zonedLots || []) {
        context += `- Score ${l.lead_score}: ${l.property_address}, ${l.property_zip} | ${l.lot_size_acres}ac | $${l.tax_assessed_value} | ${l.owner_name}\n`
      }
    }
  }

  // Deal math context
  context += `\nDeal math defaults: Build cost $165/sqft, 1600sqft build ($264K total), 20% builder margin, $10K wholesale fee. Max offer = ARV × 0.80 - $264K - $10K.\n`

  return context
}

async function askMiniMax(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const res = await fetch(MINIMAX_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_KEY}` },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    })
    const data = await res.json()
    if (data.error) return null
    return data.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

interface LotCard {
  id: string
  address: string
  zip: string
  county: string
  score: number
  acres: number
  assessed: number
  zoning: string
  owner: string
  absentee: boolean
  taxStatus: string
}

async function getLotsForQuery(query: string): Promise<LotCard[]> {
  const q = query.toLowerCase()
  let qb = supabase.from('lots').select('id, property_address, property_zip, county, lead_score, lot_size_acres, tax_assessed_value, zoning, owner_name, is_absentee_owner, tax_status')

  // Zip filter
  const zipMatch = q.match(/\b(30\d{3})\b/)
  if (zipMatch) qb = qb.eq('property_zip', zipMatch[1])

  // Zoning filter
  const zoningMatch = q.match(/(mr-?\d+|r-?\d+|r\d)/i)
  if (zoningMatch) {
    const z = zoningMatch[1].toUpperCase().replace(/^R(\d)$/, 'R-$1')
    qb = qb.eq('zoning', z)
  }

  // Absentee filter
  if (q.includes('absentee')) qb = qb.eq('is_absentee_owner', true)

  // Tax delinquent
  if (q.includes('delinquent') || q.includes('tax lien')) qb = qb.eq('tax_status', 'delinquent')

  // Cheap/low value
  if (q.includes('cheap') || q.includes('under $5') || q.includes('$0')) qb = qb.lte('tax_assessed_value', 5000)

  // Score filter
  if (q.includes('hot') || q.includes('best') || q.includes('top')) qb = qb.gte('lead_score', 70)

  // Address/owner search
  const addrMatch = q.match(/(?:find|search|look up|where is)\s+(.+)/i)
  if (addrMatch) {
    const term = addrMatch[1].replace(/[?.,]/g, '').trim()
    if (term.length > 2) {
      qb = supabase.from('lots').select('id, property_address, property_zip, county, lead_score, lot_size_acres, tax_assessed_value, zoning, owner_name, is_absentee_owner, tax_status')
        .or(`property_address.ilike.%${term}%,owner_name.ilike.%${term}%`)
    }
  }

  const { data } = await qb.order('lead_score', { ascending: false }).limit(20)

  return (data || []).map(l => ({
    id: l.id,
    address: l.property_address,
    zip: l.property_zip,
    county: l.county,
    score: l.lead_score,
    acres: l.lot_size_acres,
    assessed: l.tax_assessed_value,
    zoning: l.zoning,
    owner: l.owner_name,
    absentee: l.is_absentee_owner,
    taxStatus: l.tax_status,
  }))
}

function buildSmartFallback(query: string, context: string, lots: LotCard[]): string {
  const q = query.toLowerCase()
  const zipMatch = q.match(/\b(30\d{3})\b/)

  if (lots.length === 0) {
    return "No lots found matching that criteria. Try asking about a specific zip code (30310, 30032), zoning type (R3, MR-2), or \"top lots\" / \"absentee owners\"."
  }

  let intro = ''
  if (zipMatch) {
    intro = `Found ${lots.length} lots in ${zipMatch[1]}. Here are the top results:`
  } else if (q.includes('absentee')) {
    intro = `Found ${lots.length} absentee-owned lots. Best opportunities:`
  } else if (q.includes('cheap') || q.includes('$0')) {
    intro = `Found ${lots.length} low-value lots. These could be motivated sellers:`
  } else if (q.includes('top') || q.includes('best') || q.includes('hot')) {
    intro = `Here are the ${lots.length} highest-scoring lots in the database:`
  } else if (q.includes('delinquent')) {
    intro = `Found ${lots.length} tax-delinquent lots — high motivation potential:`
  } else {
    intro = `Here's what I found (${lots.length} lots):`
  }

  // Summary stats
  const avgScore = Math.round(lots.reduce((s, l) => s + l.score, 0) / lots.length)
  const absenteeCount = lots.filter(l => l.absentee).length
  intro += `\n\nAvg score: ${avgScore} | ${absenteeCount}/${lots.length} absentee owners`

  return intro
}

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const context = await getContext(message)

  const systemPrompt = `You are LotScout AI, an expert assistant for Atlanta metro vacant land acquisition and wholesaling. You help analyze lots, suggest strategies, and provide actionable insights.

You have access to the following database context:
${context}

Rules:
- Be concise and actionable
- When discussing specific lots, include the address, score, acreage, and assessed value
- For deal analysis, use: ARV × 0.80 - build cost ($264K for 1600sqft) - $10K wholesale fee = max offer
- Highlight absentee owners as higher-priority targets
- MR-2 and R-5 zoning allows higher density = more valuable
- Sweet spot lot size: 0.14-0.22 acres
- Flag any red flags (government-owned, HOA, too small/large)
- If you don't have enough data, say so and suggest what to look up`

  // Query lots for structured data
  const lots = await getLotsForQuery(message)

  // Try MiniMax first
  const aiResponse = await askMiniMax(systemPrompt, message)

  if (aiResponse) {
    return NextResponse.json({ response: aiResponse, lots, source: 'minimax' })
  }

  // Smart fallback without AI
  const fallback = buildSmartFallback(message, context, lots)
  return NextResponse.json({ response: fallback, lots, source: 'fallback' })
}
