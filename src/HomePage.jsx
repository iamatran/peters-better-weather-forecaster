import { useEffect, useMemo, useRef, useState } from 'react'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import AirRounded from '@mui/icons-material/AirRounded'
import CloudRounded from '@mui/icons-material/CloudRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import FilterDramaRounded from '@mui/icons-material/FilterDramaRounded'
import Foggy from '@mui/icons-material/Foggy'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import LocationOnRounded from '@mui/icons-material/LocationOnRounded'
import MyLocationRounded from '@mui/icons-material/MyLocationRounded'
import ThunderstormRounded from '@mui/icons-material/ThunderstormRounded'
import WaterDropRounded from '@mui/icons-material/WaterDropRounded'
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'
import {
  dailyForecast,
  fetchForecast,
  locationLabel,
  nextHours,
  searchLocations,
  weatherInfo,
} from './weather'

const WEATHER_ICONS = {
  clear: WbSunnyRounded,
  partly: FilterDramaRounded,
  cloud: CloudRounded,
  fog: Foggy,
  rain: WaterDropRounded,
  snow: AcUnitRounded,
  storm: ThunderstormRounded,
}

function WeatherIcon({ code, fontSize = 'medium', sx }) {
  const { kind } = weatherInfo(code)
  const Icon = WEATHER_ICONS[kind] ?? CloudRounded
  return <Icon color="primary" fontSize={fontSize} sx={sx} />
}

function formatHour(isoTime) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  }).format(new Date(isoTime))
}

function calendarDay(isoTime) {
  const date = new Date(isoTime)
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatHourlyDayLabel(isoTime, currentIsoTime) {
  const diffDays = Math.round(
    (calendarDay(isoTime) - calendarDay(currentIsoTime)) / 86_400_000,
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays === 1) return 'Tomorrow'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
  }).format(new Date(isoTime))
}

function formatWeekday(isoDate, index) {
  if (index === 0) return 'Today'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
  }).format(new Date(`${isoDate}T12:00:00`))
}

function ModeToggle() {
  const { mode, setMode } = useColorScheme()

  if (!mode) return null

  const nextMode = mode === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip title={nextMode === 'dark' ? 'Dark mode' : 'Light mode'}>
      <IconButton color="inherit" onClick={() => setMode(nextMode)}>
        {mode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
      </IconButton>
    </Tooltip>
  )
}

function Stat({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {icon}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Stack>
  )
}

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [searching, setSearching] = useState(false)
  const [location, setLocation] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [unit, setUnit] = useState('fahrenheit')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  const hours = useMemo(() => nextHours(forecast), [forecast])
  const days = useMemo(() => dailyForecast(forecast), [forecast])
  const currentHourRef = useRef(null)
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C'
  const windUnit = unit === 'fahrenheit' ? 'mph' : 'km/h'

  useEffect(() => {
    const node = currentHourRef.current
    if (!node) return

    const scroller = node.parentElement
    if (!scroller) return

    const left = node.offsetLeft - scroller.clientWidth / 2 + node.offsetWidth / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'auto' })
  }, [hours])

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setOptions([])
        return
      }

      setSearching(true)
      try {
        setOptions(await searchLocations(query))
      } catch {
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, 280)

    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!location) return

    let cancelled = false

    async function loadForecast() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchForecast(
          location.latitude,
          location.longitude,
          unit,
        )
        if (!cancelled) setForecast(data)
      } catch (loadError) {
        if (!cancelled) {
          setForecast(null)
          setError(loadError.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadForecast()
    return () => {
      cancelled = true
    }
  }, [location, unit])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot share a location.')
      return
    }

    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          id: 'current-location',
          name: 'Current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocating(false)
      },
      () => {
        setError('Location access was denied. Search for a city instead.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  const current = forecast?.current
  const currentInfo = current ? weatherInfo(current.weather_code) : null

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <FilterDramaRounded color="primary" sx={{ mr: 1.25 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Peter's Better Weather
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={unit}
            onChange={(_, value) => value && setUnit(value)}
            aria-label="Temperature unit"
            sx={{ mr: 1 }}
          >
            <ToggleButton value="fahrenheit">°F</ToggleButton>
            <ToggleButton value="celsius">°C</ToggleButton>
          </ToggleButtonGroup>
          <ModeToggle />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 }, flexGrow: 1 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 32, sm: 44 }, mb: 1 }}>
              A clearer forecast
            </Typography>
            <Typography color="text.secondary">
              Search a city or use your location for current conditions, the next
              48 hours, and a 7-day outlook.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={options}
              loading={searching}
              value={location}
              filterOptions={(items) => items}
              getOptionLabel={locationLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, value) => setLocation(value)}
              onInputChange={(_, value, reason) => {
                if (reason === 'input') setQuery(value)
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search a city"
                  placeholder="Austin, Chicago, Tokyo…"
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      startAdornment: (
                        <>
                          <LocationOnRounded color="action" sx={{ mr: 1 }} />
                          {params.slotProps.input.startAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
            <Tooltip title="Use my location">
              <IconButton
                color="primary"
                onClick={useCurrentLocation}
                disabled={locating}
                aria-label="Use my location"
                sx={{
                  alignSelf: { xs: 'flex-end', sm: 'center' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  width: 48,
                  height: 48,
                }}
              >
                {locating ? <CircularProgress size={22} /> : <MyLocationRounded />}
              </IconButton>
            </Tooltip>
          </Stack>

          {loading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}

          {!location && !error && (
            <Card variant="outlined">
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <FilterDramaRounded color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>
                  Start with a place
                </Typography>
                <Typography color="text.secondary">
                  Pick a city above, or share your location to see the forecast.
                </Typography>
              </CardContent>
            </Card>
          )}

          {current && currentInfo && (
            <>
              <Card>
                <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={3}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Chip
                        icon={<LocationOnRounded />}
                        label={locationLabel(location)}
                        size="small"
                        sx={{ mb: 1.5 }}
                      />
                      <Typography variant="h2" sx={{ fontSize: { xs: 56, sm: 72 }, lineHeight: 1 }}>
                        {Math.round(current.temperature_2m)}
                        {unitSymbol}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <WeatherIcon code={current.weather_code} />
                        <Typography variant="h6">{currentInfo.label}</Typography>
                      </Stack>
                    </Box>

                    <Stack spacing={2} sx={{ minWidth: { sm: 220 } }}>
                      <Stat
                        icon={<WbSunnyRounded color="action" />}
                        label="Feels like"
                        value={`${Math.round(current.apparent_temperature)}${unitSymbol}`}
                      />
                      <Stat
                        icon={<WaterDropRounded color="action" />}
                        label="Humidity"
                        value={`${current.relative_humidity_2m}%`}
                      />
                      <Stat
                        icon={<AirRounded color="action" />}
                        label="Wind"
                        value={`${Math.round(current.wind_speed_10m)} ${windUnit}`}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Box>
                <Typography variant="h2" sx={{ fontSize: 20, mb: 0.5 }}>
                  48-hour forecast
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Previous 6 hours and the next 48 hours
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.25}
                  sx={{ overflowX: 'auto', pb: 1 }}
                >
                  {hours.map((hour, index) => {
                    const previousDate = index > 0 ? hours[index - 1].time.slice(0, 10) : null
                    const showDayLabel =
                      index === 0 || hour.time.slice(0, 10) !== previousDate

                    return (
                      <Card
                        key={hour.time}
                        ref={hour.isCurrent ? currentHourRef : undefined}
                        variant="outlined"
                        aria-current={hour.isCurrent ? 'true' : undefined}
                        sx={{
                          minWidth: hour.isCurrent ? 108 : 92,
                          flexShrink: 0,
                          textAlign: 'center',
                          opacity: hour.isPast ? 0.62 : 1,
                          borderWidth: hour.isCurrent ? 2 : 1,
                          borderColor: hour.isCurrent ? 'primary.main' : 'divider',
                          bgcolor: hour.isCurrent ? 'action.selected' : 'background.paper',
                          boxShadow: hour.isCurrent ? 3 : 0,
                        }}
                      >
                        <CardContent sx={{ px: 1.5, py: 1.75, '&:last-child': { pb: 1.75 } }}>
                          <Typography
                            variant="caption"
                            color={hour.isCurrent ? 'primary' : 'text.secondary'}
                            sx={{ display: 'block', minHeight: 20, fontWeight: 600 }}
                          >
                            {showDayLabel
                              ? formatHourlyDayLabel(hour.time, current.time)
                              : '\u00a0'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={hour.isCurrent ? 'primary' : 'text.secondary'}
                            fontWeight={hour.isCurrent ? 700 : 400}
                          >
                            {hour.isCurrent ? 'Now' : formatHour(hour.time)}
                          </Typography>
                          <Box sx={{ my: 0.75 }}>
                            <WeatherIcon code={hour.weatherCode} />
                          </Box>
                          <Typography fontWeight={700}>
                            {Math.round(hour.temperature)}°
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {hour.precipitation}%
                          </Typography>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>

              <Box>
                <Typography variant="h2" sx={{ fontSize: 20, mb: 1.5 }}>
                  7-day outlook
                </Typography>
                <Stack spacing={1}>
                  {days.map((day, index) => {
                    const info = weatherInfo(day.weatherCode)
                    return (
                      <Card key={day.date} variant="outlined">
                        <CardContent
                          sx={{
                            py: 1.5,
                            px: 2,
                            '&:last-child': { pb: 1.5 },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography sx={{ minWidth: 88, fontWeight: 600 }}>
                              {formatWeekday(day.date, index)}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                              <WeatherIcon code={day.weatherCode} />
                              <Typography color="text.secondary">{info.label}</Typography>
                            </Stack>
                            <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                              {day.precipitation}% rain
                            </Typography>
                            <Typography fontWeight={700} sx={{ minWidth: 72, textAlign: 'right' }}>
                              {Math.round(day.high)}° / {Math.round(day.low)}°
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
