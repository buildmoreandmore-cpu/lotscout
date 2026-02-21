/**
 * RPR (Realtors Property Resource) Headless Scraper
 * 
 * Logs into narrpr.com and pulls property data + comps for lots in our database.
 * Uses Playwright with headless Chromium.
 */

import { chromium, Browser, Page } from 'playwright'

const RPR_LOGIN_URL = 'https://www.narrpr.com/'
const RPR_USERNAME = 'JosephineDuCreay@gmail.com'
const RPR_PASSWORD = 'Slrhomes$$@2024'

const SUPABASE_URL = 'https://vbwcatbixcgakdwgdavl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2NhdGJpeGNnYWtkd2dkYXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MzM4NywiZXhwIjoyMDg3MjY5Mzg3fQ.2j0q61nh9cJJa420-SxBEJMA2SuPRft6azAPNT8-C_M'

interface LotForComps {
  id: string
  property_address: string
  property_city: string
  property_zip: string
  county: string
}

async function login(page: Page): Promise<boolean> {
  console.log('🔐 Logging into RPR...')
  await page.goto(RPR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(5000) // Let SPA render
  
  // Take screenshot to see what we're working with
  await page.screenshot({ path: '/tmp/rpr-login.png' })
  console.log('  URL:', page.url())
  
  // The page redirects to auth.narrpr.com with email + password fields already visible
  // Wait for the form to be ready
  await page.waitForSelector('input[placeholder*="gmail"], input[placeholder*="mail"], input[type="email"], input[type="text"]', { timeout: 15000 }).catch(() => null)
  
  // Fill email - the placeholder says "e.g. user@gmail.com"
  const allInputs = await page.$$('input')
  console.log(`  Found ${allInputs.length} input fields`)
  
  // Fill email field (first text/email input)
  await page.fill('input[placeholder*="gmail"], input[placeholder*="mail"]', RPR_USERNAME).catch(async () => {
    // Fallback: try all text inputs
    const inputs = await page.$$('input[type="text"], input[type="email"], input:not([type])')
    if (inputs[0]) await inputs[0].fill(RPR_USERNAME)
  })
  console.log('  Filled email')
  
  // Fill password
  await page.fill('input[type="password"], input[placeholder*="Case"]', RPR_PASSWORD).catch(async () => {
    const pwdInputs = await page.$$('input[type="password"]')
    if (pwdInputs[0]) await pwdInputs[0].fill(RPR_PASSWORD)
  })
  console.log('  Filled password')
  
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/tmp/rpr-filled.png' })
  
  // Click Sign In button (should be enabled now)
  await page.click('button:has-text("Sign In"), button[type="submit"]')
  console.log('  Clicked Sign In')
  
  // Wait for navigation
  await page.waitForTimeout(5000)
  await page.screenshot({ path: '/tmp/rpr-after-login.png' })
  
  const url = page.url()
  console.log(`  Current URL: ${url}`)
  
  // Check if login succeeded
  const isLoggedIn = !url.includes('login') && !url.includes('auth')
  console.log(`  Login ${isLoggedIn ? '✅ SUCCESS' : '❌ FAILED'}`)
  
  return isLoggedIn
}

async function searchProperty(page: Page, address: string, zip: string): Promise<any> {
  // Clean address — remove "LOT X", "# REAR" etc for search
  const cleanAddr = address.replace(/\s*(LOT\s*\d+|#\s*REAR|REAR)\s*/gi, '').trim()
  console.log(`  🔍 Searching: ${cleanAddr}, ${zip}`)
  
  // Use RPR's search bar on the home page
  await page.goto('https://www.narrpr.com/home', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(3000)
  
  // RPR search bar: "Enter Address, Place, APN/Tax IDs or Listing IDs"
  const input = await page.$('input[placeholder*="Enter Address"], input[placeholder*="Address"], input[placeholder*="Place"], input[placeholder*="APN"]')
  if (!input) {
    console.log('  ⚠️ Could not find search input')
    await page.screenshot({ path: '/tmp/rpr-no-search.png' })
    return null
  }
  
  await input.click({ clickCount: 3 }) // Select all existing text
  await page.waitForTimeout(500)
  await input.fill('')
  await input.type(`${cleanAddr}, Atlanta, GA ${zip}`, { delay: 30 })
  await page.waitForTimeout(4000) // Wait for autocomplete dropdown
  await page.screenshot({ path: `/tmp/rpr-search-${zip}.png` })
  
  // Look for autocomplete suggestions — need to click an ADDRESS result, not a listing ID
  const suggestions = await page.$$('[role="option"], [class*="suggestion"], [class*="autocomplete"] li, [class*="dropdown"] li, [class*="result-item"]')
  console.log(`  Found ${suggestions.length} suggestions`)
  
  let clicked = false
  for (const s of suggestions) {
    const text = await s.textContent() || ''
    // Skip listing ID suggestions, look for address matches
    if (text.toLowerCase().includes(cleanAddr.split(' ')[0].toLowerCase())) {
      await s.click()
      console.log(`  Clicked: ${text.trim().slice(0, 80)}`)
      clicked = true
      break
    }
  }
  
  if (!clicked && suggestions.length > 0) {
    // Click first suggestion
    await suggestions[0].click()
    const text = await suggestions[0].textContent() || ''
    console.log(`  Clicked first: ${text.trim().slice(0, 80)}`)
    clicked = true
  }
  
  if (!clicked) {
    // Just press Enter
    await page.keyboard.press('Enter')
    console.log('  Pressed Enter')
  }
  
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `/tmp/rpr-property-${zip}.png` })
  
  const url = page.url()
  console.log(`  URL: ${url}`)
  
  // Check if we landed on a property page
  if (url.includes('/property/')) {
    // Extract property data
    const data = await page.evaluate(() => {
      const body = document.body.innerText || ''
      return {
        url: window.location.href,
        title: document.title,
        body: body.slice(0, 5000),
      }
    })
    return data
  }
  
  // Maybe we're on a search results page
  const resultLink = await page.$('a[href*="/property/"]')
  if (resultLink) {
    await resultLink.click()
    await page.waitForTimeout(5000)
    const data = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      body: (document.body.innerText || '').slice(0, 5000),
    }))
    return data
  }
  
  console.log('  No property result found')
  return null
}

async function getTopLots(): Promise<LotForComps[]> {
  // Get lots with real addresses (not "0 ..." addresses)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lots?select=id,property_address,property_city,property_zip,county&property_address=not.like.0 *&lead_score=gte.60&order=lead_score.desc&limit=10`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  )
  return await res.json()
}

async function main() {
  console.log('🏠 RPR Scraper — Starting')
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })
  
  const page = await context.newPage()
  
  try {
    const loggedIn = await login(page)
    
    if (!loggedIn) {
      console.log('\n⚠️ Login failed — saving screenshots for debugging')
      console.log('  Check /tmp/rpr-login.png and /tmp/rpr-login-debug.png')
      await browser.close()
      return
    }
    
    // Get top lots to search
    const lots = await getTopLots()
    console.log(`\n📋 Searching ${lots.length} top lots on RPR...`)
    
    for (const lot of lots.slice(0, 3)) { // Start with just 3 to test
      const result = await searchProperty(page, lot.property_address, lot.property_zip)
      if (result) {
        console.log(`  ✅ Found: ${result.title}`)
        console.log(`  URL: ${result.url}`)
        console.log(`  Data preview: ${result.body?.slice(0, 200)}`)
      }
      await page.waitForTimeout(2000) // Be polite
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
    await page.screenshot({ path: '/tmp/rpr-error.png' })
  } finally {
    await browser.close()
  }
  
  console.log('\n🏁 Done')
}

main().catch(console.error)
