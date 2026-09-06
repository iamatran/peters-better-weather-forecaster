import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1565c0' },
        secondary: { main: '#00838f' },
        background: { default: '#eef4fa', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#90caf9' },
        secondary: { main: '#80deea' },
        background: { default: '#0d1520', paper: '#15202b' },
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 500, letterSpacing: '-0.03em' },
    h2: { fontWeight: 500, letterSpacing: '-0.02em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
})

export default theme
