type CacheEntry<T> = {
  saved_at: number
  data: T
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    )
    const normalized: Record<string, unknown> = {}
    for (const [key, item] of entries) {
      normalized[key] = normalizeValue(item)
    }
    return normalized
  }
  return value
}

export function createCacheKey(prefix: string, payload?: unknown) {
  if (payload === undefined) return prefix
  return `${prefix}:${JSON.stringify(normalizeValue(payload))}`
}

export function readCache<T>(key: string, ttlMs: number) {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (!entry || typeof entry.saved_at !== 'number') return null
    if (ttlMs > 0 && Date.now() - entry.saved_at > ttlMs) return null
    return entry.data
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T) {
  if (!canUseStorage()) return
  try {
    const entry: CacheEntry<T> = {
      saved_at: Date.now(),
      data,
    }
    window.localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Ignore storage quota / JSON errors.
  }
}

export function clearCache(key: string) {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage errors.
  }
}
