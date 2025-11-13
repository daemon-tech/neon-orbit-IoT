/**
 * Efficient Number Formatting with Caching
 * Reduces string allocations for high-frequency updates
 */
let cache = new Map<string, string>()
const CACHE_SIZE_LIMIT = 10000

export function formatNumber(n: bigint | number): string {
  const key = n.toString()
  
  // Check cache
  if (cache.has(key)) {
    return cache.get(key)!
  }

  // Format number
  const num = typeof n === 'bigint' ? Number(n) : n
  let str: string

  if (num >= 1_000_000_000_000) {
    str = `${(num / 1_000_000_000_000).toFixed(2)}T`
  } else if (num >= 1_000_000_000) {
    str = `${(num / 1_000_000_000).toFixed(1)}B`
  } else if (num >= 1_000_000) {
    str = `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    str = `${(num / 1_000).toFixed(1)}K`
  } else {
    str = num.toString()
  }

  // Cache result (with size limit)
  if (cache.size >= CACHE_SIZE_LIMIT) {
    // Clear oldest 50% of cache
    const entries = Array.from(cache.entries())
    cache.clear()
    entries.slice(Math.floor(entries.length / 2)).forEach(([k, v]) => {
      cache.set(k, v)
    })
  }
  
  cache.set(key, str)
  return str
}

export function formatBytes(bytes: bigint | number): string {
  const num = typeof bytes === 'bigint' ? Number(bytes) : bytes
  
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)} TB`
  } else if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)} GB`
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)} MB`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)} KB`
  }
  return `${num} B`
}

/**
 * Clear format cache (useful for memory management)
 */
export function clearFormatCache(): void {
  cache.clear()
}

