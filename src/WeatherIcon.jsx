import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import CloudRounded from '@mui/icons-material/CloudRounded'
import FilterDramaRounded from '@mui/icons-material/FilterDramaRounded'
import Foggy from '@mui/icons-material/Foggy'
import ThunderstormRounded from '@mui/icons-material/ThunderstormRounded'
import WaterDropRounded from '@mui/icons-material/WaterDropRounded'
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded'
import Tooltip from '@mui/material/Tooltip'
import { weatherInfo } from './weather'

const WEATHER_ICONS = {
  clear: WbSunnyRounded,
  partly: FilterDramaRounded,
  cloud: CloudRounded,
  fog: Foggy,
  rain: WaterDropRounded,
  snow: AcUnitRounded,
  storm: ThunderstormRounded,
}

export default function WeatherIcon({ code, fontSize = 'medium', sx }) {
  const { kind, label } = weatherInfo(code)
  const Icon = WEATHER_ICONS[kind] ?? CloudRounded
  return (
    <Tooltip title={label} placement="left">
      <Icon color="primary" fontSize={fontSize} sx={sx} aria-label={label} />
    </Tooltip>
  )
}
