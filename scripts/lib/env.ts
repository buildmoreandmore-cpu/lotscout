/**
 * Zero-dependency .env loader for standalone scripts.
 *
 * Next.js loads .env automatically for the app, but `tsx scripts/*.ts` does not,
 * so we read it here. Secrets live ONLY in .env (gitignored) — never in source.
 */
import * as fs from 'fs'
import * as path from 'path'

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

export function requireEnv(name: string): string {
  loadEnv()
  const v = process.env[name]
  if (!v) {
    console.error(`\n❌ Missing required env var: ${name}`)
    console.error(`   Add it to .env (copy .env.example and fill in the values).\n`)
    process.exit(1)
  }
  return v
}

export function optionalEnv(name: string): string | undefined {
  loadEnv()
  return process.env[name] || undefined
}
