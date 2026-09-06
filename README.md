# Peter's Better Weather Forecaster

A React weather app with city search, current conditions, an hourly view, and a 7-day outlook. It uses [Material UI](https://mui.com/) and [Open-Meteo](https://open-meteo.com/) (no API key).

## Live Preview

View the live website at:

[https://iamatran.github.io/peters-better-weather-forecaster/](https://iamatran.github.io/peters-better-weather-forecaster/)

## Setup

Requires Node.js 20+.

```bash
npm install
```

## Dev commands

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot reload |
| `npm run build`   | Create a production build in `dist/`      |
| `npm run preview` | Serve the production build locally        |
| `npm run lint`    | Run ESLint on the project                 |

The Vite `base` path matches the GitHub repo name, so local URLs include that prefix:

- Dev: http://localhost:5173/peters-better-weather-forecaster/
- Preview: http://localhost:4173/peters-better-weather-forecaster/

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
