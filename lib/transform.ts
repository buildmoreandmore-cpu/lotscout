// Transform snake_case Supabase rows to camelCase for frontend
export function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  if (obj === null || typeof obj !== 'object') return obj
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = snakeToCamel(value)
  }
  return result
}

// Transform camelCase input to snake_case for Supabase
export function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  if (obj === null || typeof obj !== 'object') return obj
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    result[snakeKey] = value
  }
  return result
}
