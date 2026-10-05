import { useEffect, useMemo, useRef, useState } from 'react'
import AirRounded from '@mui/icons-material/AirRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import FilterDramaRounded from '@mui/icons-material/FilterDramaRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import LocationOnRounded from '@mui/icons-material/LocationOnRounded'
import MyLocationRounded from '@mui/icons-material/MyLocationRounded'
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
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'
import { useLocation, useNavigate } from 'react-router'
import MonthlyView from './MonthlyView'
import { readRecentCities, removeRecentCity, saveRecentCity } from './recentCities'
import RadarMap from './RadarMap'
import WeatherIcon from './WeatherIcon'
import {
  dailyForecast,
  fetchForecast,
  fetchMonthlyForecast,
  locationLabel,
  monthlyForecastDays,
  nextHours,
  searchLocations,
  weatherInfo,
} from './weather'

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
  const { mode, setMode, systemMode } = useColorScheme()

  if (!mode) return null

  const resolvedMode = mode === 'system' ? systemMode : mode
  const nextMode = resolvedMode === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip title={nextMode === 'dark' ? 'Dark mode' : 'Light mode'}>
      <IconButton color="inherit" onClick={() => setMode(nextMode)}>
        {resolvedMode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
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
  const [recentCities, setRecentCities] = useState(readRecentCities)
  const [location, setLocation] = useState(() => readRecentCities()[0] ?? null)
  const [forecast, setForecast] = useState(null)
  const [unit, setUnit] = useState('fahrenheit')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const route = useLocation()
  const navigate = useNavigate()
  const path = route.pathname.replace(/\/$/, '') || '/'
  const tab = path.endsWith('/forecast') ? 'forecast' : 'monthly'

  useEffect(() => {
    if (!path.endsWith('/monthly') && !path.endsWith('/forecast')) {
      navigate('/monthly', { replace: true })
    }
  }, [path, navigate])
  const [monthlyForecast, setMonthlyForecast] = useState(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState('')

  const hours = useMemo(() => nextHours(forecast), [forecast])
  const days = useMemo(() => dailyForecast(forecast), [forecast])
  const monthDays = useMemo(
    () => monthlyForecastDays(monthlyForecast),
    [monthlyForecast],
  )
  const dropdownOptions = useMemo(() => {
    const list = query.trim().length < 2 ? recentCities : options
    if (!location) return list
    if (list.some((item) => String(item.id) === String(location.id))) return list
    return [location, ...list]
  }, [location, options, query, recentCities])
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

  useEffect(() => {
    if (!location) return

    let cancelled = false

    async function loadMonthly() {
      setMonthlyLoading(true)
      setMonthlyError('')
      setMonthlyForecast(null)
      try {
        const data = await fetchMonthlyForecast(
          location.latitude,
          location.longitude,
          unit,
        )
        if (!cancelled) setMonthlyForecast(data)
      } catch (loadError) {
        if (!cancelled) {
          setMonthlyForecast(null)
          setMonthlyError(loadError.message)
        }
      } finally {
        if (!cancelled) setMonthlyLoading(false)
      }
    }

    loadMonthly()
    return () => {
      cancelled = true
    }
  }, [location, unit])

  function selectLocation(place) {
    setLocation(place)
    setQuery('')
    if (!place) {
      setMonthlyForecast(null)
      setMonthlyError('')
      return
    }
    setRecentCities((previous) => saveRecentCity(place, previous))
  }

  function removeRecent(place, event) {
    event.preventDefault()
    event.stopPropagation()
    setRecentCities((previous) => removeRecentCity(place.id, previous))
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot share a location.')
      return
    }

    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectLocation({
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
        <Tabs
          value={tab}
          onChange={(_, value) => navigate(value === 'forecast' ? '/forecast' : '/monthly')}
          aria-label="Forecast views"
          centered
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '1.05rem', sm: '1.2rem' },
              minHeight: 56,
            },
          }}
        >
          <Tab
            icon={<CalendarMonthRounded />}
            iconPosition="start"
            label="Monthly"
            value="monthly"
            id="monthly-tab"
            aria-controls="monthly-panel"
          />
          <Tab
            icon={<WbSunnyRounded />}
            iconPosition="start"
            label="Forecast"
            value="forecast"
            id="forecast-tab"
            aria-controls="forecast-panel"
          />
        </Tabs>
      </AppBar>

      <Container
        maxWidth={tab === 'monthly' ? false : 'md'}
        sx={{
          py: { xs: 2, sm: 3 },
          px: { xs: 1.5, sm: 3 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Stack spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
          {tab === 'forecast' && (
            <Box>
              <Typography variant="h1" sx={{ fontSize: { xs: 32, sm: 44 }, mb: 1 }}>
                A clearer forecast
              </Typography>
              <Typography color="text.secondary">
                Search a city or use your location for current conditions, the next
                48 hours, and a 7-day outlook.
              </Typography>
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={dropdownOptions}
              loading={searching}
              value={location}
              openOnFocus
              filterOptions={(items) => {
                if (query.trim().length >= 2 || !location) return items
                const stillRecent = recentCities.some(
                  (item) => String(item.id) === String(location.id),
                )
                if (stillRecent) return items
                return items.filter((item) => String(item.id) !== String(location.id))
              }}
              getOptionKey={(option) => String(option?.id ?? '')}
              getOptionLabel={(option) => locationLabel(option) || ''}
              isOptionEqualToValue={(option, value) =>
                option?.id != null && value?.id != null && String(option.id) === String(value.id)
              }
              groupBy={() => (query.trim().length < 2 ? 'Recent' : 'Search results')}
              noOptionsText={
                query.trim().length < 2 ? 'Search a city to get started' : 'No matching cities'
              }
              onChange={(_, value) => selectLocation(value)}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props
                const isRecent =
                  query.trim().length < 2 &&
                  recentCities.some((item) => String(item.id) === String(option.id))
                const label = locationLabel(option)
                return (
                  <li key={key} {...optionProps}>
                    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                      {label}
                    </Box>
                    {isRecent && (
                      <IconButton
                        size="small"
                        aria-label={`Remove ${label}`}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onClick={(event) => removeRecent(option, event)}
                        sx={{ ml: 1, mr: -0.5 }}
                      >
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    )}
                  </li>
                )
              }}
              onInputChange={(_, value, reason) => {
                if (reason === 'input' || reason === 'clear') setQuery(value)
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

          {(loading || (tab === 'monthly' && monthlyLoading)) && <LinearProgress />}
          {tab === 'forecast' && error && <Alert severity="error">{error}</Alert>}
          {tab === 'monthly' && monthlyError && <Alert severity="error">{monthlyError}</Alert>}

          {!location && !(tab === 'forecast' ? error : monthlyError) && (
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

          {tab === 'monthly' && location && monthlyLoading && monthDays.length === 0 && !monthlyError && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {tab === 'monthly' && location && monthDays.length > 0 && (
            <Box
              role="tabpanel"
              id="monthly-panel"
              aria-labelledby="monthly-tab"
              sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}
            >
              <MonthlyView
                days={monthDays}
                timezone={monthlyForecast.timezone}
                unit={unit}
                unitSymbol={unitSymbol}
                latitude={location.latitude}
                longitude={location.longitude}
                placeLabel={locationLabel(location)}
              />
            </Box>
          )}

          {tab === 'forecast' && current && currentInfo && (
            <Box role="tabpanel" id="forecast-panel" aria-labelledby="forecast-tab">
            <Stack spacing={3}>
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

              <RadarMap latitude={location.latitude} longitude={location.longitude} />

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
            </Stack>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
