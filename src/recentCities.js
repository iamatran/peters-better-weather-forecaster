const STORAGE_KEY = 'peters-better-weather:recent-cities'
export const MAX_RECENT_CITIES = 10

function getStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

function isStoredCity(city) {
  return (
    city != null &&
    typeof city === 'object' &&
    city.id != null &&
    typeof city.name === 'string' &&
    Number.isFinite(Number(city.latitude)) &&
    Number.isFinite(Number(city.longitude))
  )
}

export function serializeCity(place) {
  return {
    id: place.id,
    name: place.name,
    admin1: place.admin1 ?? '',
    country: place.country ?? '',
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  }
}

export function readRecentCities() {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isStoredCity).slice(0, MAX_RECENT_CITIES)
  } catch {
    return []
  }
}

export function saveRecentCity(place, previous = readRecentCities()) {
  if (!place || !isStoredCity(serializeCity(place))) return previous

  const city = serializeCity(place)
  const next = [
    city,
    ...previous.filter((item) => String(item.id) !== String(city.id)),
  ].slice(0, MAX_RECENT_CITIES)

  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore quota or private-mode failures; the in-memory list still updates.
    }
  }

  return next
}
