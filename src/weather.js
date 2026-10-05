const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast'

export async function searchLocations(query) {
  const name = query.trim()
  if (name.length < 2) return []

  const url = new URL(GEOCODE_URL)
  url.searchParams.set('name', name)
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not search locations')

  const data = await response.json()
  return data.results ?? []
}

export function localDateISO(timeZone) {
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }
  if (timeZone) options.timeZone = timeZone

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date())
  const value = (type) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

export async function fetchForecast(latitude, longitude, unit) {
  const imperial = unit === 'fahrenheit'
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
  )
  url.searchParams.set(
    'hourly',
    'temperature_2m,weather_code,precipitation_probability',
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  )
  url.searchParams.set('temperature_unit', imperial ? 'fahrenheit' : 'celsius')
  url.searchParams.set('wind_speed_unit', imperial ? 'mph' : 'kmh')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('past_hours', '6')
  url.searchParams.set('forecast_hours', '48')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load the forecast')
  return response.json()
}

export async function fetchMonthlyForecast(latitude, longitude, unit) {
  const imperial = unit === 'fahrenheit'
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  )
  url.searchParams.set('temperature_unit', imperial ? 'fahrenheit' : 'celsius')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '16')
  url.searchParams.set('past_days', '31')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load the monthly forecast')
  return response.json()
}

export async function fetchArchiveDaily(latitude, longitude, unit, startDate, endDate) {
  const imperial = unit === 'fahrenheit'
  const url = new URL(ARCHIVE_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  )
  url.searchParams.set('temperature_unit', imperial ? 'fahrenheit' : 'celsius')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load historical weather')
  const data = await response.json()
  if (!data.daily?.time) return []

  return data.daily.time.map((date, index) => ({
    date,
    weatherCode: data.daily.weather_code[index],
    high: data.daily.temperature_2m_max[index],
    low: data.daily.temperature_2m_min[index],
    precipitation: data.daily.precipitation_probability_max[index],
  }))
}

export function locationLabel(place) {
  if (!place) return ''
  return [place.name, place.admin1, place.country].filter(Boolean).join(', ')
}

export function weatherInfo(code) {
  if (code === 0) return { label: 'Clear', kind: 'clear' }
  if (code <= 3) return { label: 'Partly cloudy', kind: 'partly' }
  if (code === 45 || code === 48) return { label: 'Fog', kind: 'fog' }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', kind: 'rain' }
  if (code >= 61 && code <= 67) return { label: 'Rain', kind: 'rain' }
  if (code >= 71 && code <= 77) return { label: 'Snow', kind: 'snow' }
  if (code >= 80 && code <= 82) return { label: 'Showers', kind: 'rain' }
  if (code === 85 || code === 86) return { label: 'Snow showers', kind: 'snow' }
  if (code >= 95) return { label: 'Thunderstorm', kind: 'storm' }
  return { label: 'Cloudy', kind: 'cloud' }
}

export function nextHours(forecast, { past = 6, future = 48 } = {}) {
  if (!forecast?.hourly || !forecast?.current?.time) return []

  const now = Date.parse(forecast.current.time)
  const hours = forecast.hourly.time.map((time, index) => ({
    time,
    temperature: forecast.hourly.temperature_2m[index],
    weatherCode: forecast.hourly.weather_code[index],
    precipitation: forecast.hourly.precipitation_probability[index],
  }))

  let currentIndex = -1
  for (let index = hours.length - 1; index >= 0; index -= 1) {
    if (Date.parse(hours[index].time) <= now) {
      currentIndex = index
      break
    }
  }
  if (currentIndex === -1) currentIndex = 0

  const start = Math.max(0, currentIndex - past)
  const end = Math.min(hours.length, currentIndex + future)

  return hours.slice(start, end).map((hour, index) => {
    const sourceIndex = start + index
    return {
      ...hour,
      isCurrent: sourceIndex === currentIndex,
      isPast: sourceIndex < currentIndex,
    }
  })
}

export function dailyForecast(forecast) {
  if (!forecast?.daily) return []

  return forecast.daily.time.map((date, index) => ({
    date,
    weatherCode: forecast.daily.weather_code[index],
    high: forecast.daily.temperature_2m_max[index],
    low: forecast.daily.temperature_2m_min[index],
    precipitation: forecast.daily.precipitation_probability_max[index],
  }))
}

export function monthlyForecastDays(forecast) {
  const days = dailyForecast(forecast)
  if (!forecast?.timezone || days.length === 0) return days

  const monthPrefix = localDateISO(forecast.timezone).slice(0, 7)
  return days.filter((day) => day.date.slice(0, 7) >= monthPrefix)
}
