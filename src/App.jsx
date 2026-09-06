import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import HomePage from './HomePage'
import theme from './theme'

export default function App() {
  return (
    <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
      <CssBaseline />
      <HomePage />
    </ThemeProvider>
  )
}
