import { useEffect, useRef, useState } from 'react'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRadarFrames, formatRadarTime, radarTileUrl } from './radar'

const CITY_ZOOM = 8
const FRAME_MS = 550
const REFRESH_MS = 5 * 60 * 1000
const RADAR_OPACITY = 0.72
const BASE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.rainviewer.com/api.html">RainViewer</a>'

function baseTileUrl(colorMode) {
  if (colorMode === 'dark') {
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  }
  return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
}

export default function RadarMap({ latitude, longitude }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const baseLayerRef = useRef(null)
  const layerCacheRef = useRef(new Map())
  const markerRef = useRef(null)
  const { mode } = useColorScheme()
  const colorMode = mode === 'dark' ? 'dark' : 'light'

  const [host, setHost] = useState('')
  const [frames, setFrames] = useState([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mapReady, setMapReady] = useState(false)

  const lat = Number(latitude)
  const lng = Number(longitude)
  const currentFrame = frames[frameIndex]
  const hasValidCenter = Number.isFinite(lat) && Number.isFinite(lng)

  useEffect(() => {
    const node = containerRef.current
    if (!node || !hasValidCenter) return undefined

    const map = L.map(node, {
      zoomControl: true,
      attributionControl: true,
      maxZoom: 10,
    }).setView([lat, lng], CITY_ZOOM)

    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: '#1565c0',
      fillColor: '#90caf9',
      fillOpacity: 0.95,
      weight: 2,
    }).addTo(map)

    mapRef.current = map
    markerRef.current = marker
    setMapReady(true)

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(node)

    return () => {
      resizeObserver.disconnect()
      layerCacheRef.current.forEach((layer) => {
        map.removeLayer(layer)
      })
      layerCacheRef.current.clear()
      map.remove()
      mapRef.current = null
      baseLayerRef.current = null
      markerRef.current = null
      setMapReady(false)
    }
    // Keep one map instance so changing cities only pans the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map instance should outlive city changes
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !hasValidCenter) return

    map.setView([lat, lng], CITY_ZOOM, { animate: true })
    markerRef.current?.setLatLng([lat, lng])
  }, [hasValidCenter, lat, lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const nextBase = L.tileLayer(baseTileUrl(colorMode), {
      attribution: BASE_ATTRIBUTION,
      maxZoom: 10,
    }).addTo(map)
    nextBase.bringToBack()

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current)
    }
    baseLayerRef.current = nextBase
  }, [colorMode, mapReady])

  useEffect(() => {
    let cancelled = false

    async function loadRadar() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchRadarFrames()
        if (cancelled) return
        setHost(data.host)
        setFrames(data.frames)
        setFrameIndex(Math.max(0, data.frames.length - 1))
      } catch (loadError) {
        if (!cancelled) setError(loadError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRadar()
    const refresh = window.setInterval(loadRadar, REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(refresh)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !host || !currentFrame) return

    const cache = layerCacheRef.current
    let layer = cache.get(currentFrame.path)
    if (!layer) {
      layer = L.tileLayer(radarTileUrl(host, currentFrame.path), {
        opacity: 0,
        maxNativeZoom: 7,
        maxZoom: 10,
        zIndex: 10,
      })
      cache.set(currentFrame.path, layer)
    }

    if (!map.hasLayer(layer)) {
      layer.addTo(map)
    }

    cache.forEach((other, path) => {
      other.setOpacity(path === currentFrame.path ? RADAR_OPACITY : 0)
    })
  }, [currentFrame, host, mapReady])

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined

    const id = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % frames.length)
    }, FRAME_MS)

    return () => window.clearInterval(id)
  }, [frames.length, playing])

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h2" sx={{ fontSize: 20 }}>
            Precipitation radar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Past 2 hours
            {currentFrame ? ` · ${formatRadarTime(currentFrame.time)}` : ''}
          </Typography>
        </Box>
        <Tooltip title={playing ? 'Pause radar' : 'Play radar'}>
          <IconButton
            color="primary"
            onClick={() => setPlaying((value) => !value)}
            disabled={frames.length < 2}
            aria-label={playing ? 'Pause radar' : 'Play radar'}
          >
            {playing ? <PauseRounded /> : <PlayArrowRounded />}
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', zIndex: 0 }}>
          <Box
            ref={containerRef}
            sx={{
              height: { xs: 260, sm: 360 },
              width: '100%',
              '& .leaflet-container': {
                height: '100%',
                width: '100%',
                fontFamily: 'inherit',
                background: 'transparent',
              },
            }}
          />
          {loading && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0, 0, 0, 0.12)',
              }}
            >
              <CircularProgress size={32} />
            </Stack>
          )}
        </Box>
        {frames.length > 1 && (
          <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
            <Slider
              size="small"
              min={0}
              max={frames.length - 1}
              value={frameIndex}
              onChange={(_, value) => {
                setPlaying(false)
                setFrameIndex(value)
              }}
              aria-label="Radar time"
            />
          </Box>
        )}
      </Card>
    </Box>
  )
}
