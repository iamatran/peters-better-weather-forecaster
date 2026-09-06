const RADAR_URL = 'https://api.rainviewer.com/public/weather-maps.json'

export async function fetchRadarFrames() {
  const response = await fetch(RADAR_URL)
  if (!response.ok) throw new Error('Could not load radar')

  const data = await response.json()
  const frames = data.radar?.past ?? []

  return {
    host: data.host,
    frames,
  }
}

export function radarTileUrl(host, framePath) {
  return `${host}${framePath}/256/{z}/{x}/{y}/2/1_1.png`
}

export function formatRadarTime(unixSeconds) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(unixSeconds * 1000))
}
