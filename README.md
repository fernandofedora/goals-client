# Project UI (goals-client)

Web application built with React + Vite and TailwindCSS. It consumes the `goals-server` API and provides a Dashboard with filters, charts and exports.

## Requirements
- Node.js 18 or 20
- npm or yarn

## Installation
1. Go into `goals-client/`.
2. Install dependencies: `npm install` or `yarn install`.

## Environment configuration
The UI uses `VITE_API_URL` to point at the backend.

Important: the client appends `/api` itself (see `src/api.js`), so `VITE_API_URL` must **not** include `/api`.

- Development: creating `goals-client/.env` is optional — the default (`http://localhost:4000`) already works, and the Vite dev server proxies `/api` to `http://localhost:4000`.
- Production: define `goals-client/.env.production`:

```
# If the UI and the API share a domain, use a relative path
VITE_API_URL=/

# Or use a valid absolute URL (without /api)
# VITE_API_URL=https://your-domain.app
```

Notes:
- Because `/api` is appended in `src/api.js`, adding it to `VITE_API_URL` produces duplicated paths such as `/api/api/...`.
- If the UI is served under a subpath, consider setting `base: './'` in `vite.config.js` so assets resolve correctly.

## Commands
- `npm run dev` → Development with HMR at `http://localhost:5173/` (or an alternative port if 5173 is taken).
- `npm run build` → Generates production artifacts in `dist/`.
- `npm run preview` → Serves `dist/` locally.
- `npm run lint` → Runs ESLint over the project.

## Authentication
- Sign-up and login via JWT.
- The token is stored in `localStorage` and attached to every request.

## Dashboard and features
- Filters: period selector (`All Time` or a specific month) and year selector.
- "Income vs Expenses" chart:
  - Always shows 12 months (January–December) of the `selectedYear`.
  - If `period = all`: aggregates the summary's daily data, filtered by year.
  - If `period` is a specific month: loads the 12 monthly summaries for the year from the backend to fill in the chart.
- XLSX export: an "Export XLSX" button that calls `/api/stats/export` with the current period.
- Budget vs Actual: shows a progress bar for the selected month when a budget exists.
- Categories: expense breakdown per category, with colors.
- Payment methods: cash vs cards breakdown, plus per-card usage.

## Best practices and deployment
- Use Node 18+ (ideally 20) for both build and runtime.
- Set `VITE_API_URL` consistently with your environment:
  - Same domain: `VITE_API_URL=/`, and configure the proxy/rewrite.
  - Different domain: `VITE_API_URL=https://backend.example.com`.
- If you see "merged" URLs in production, check:
  - The value of `VITE_API_URL` (it must be absolute or `/`, and must not end in `/api`).
  - The server hosting the UI (if it serves under a subpath, adjust `base`).

## Troubleshooting
- Build failure in staging (Rollup/ModuleLoader):
  - Verify Node (>=18) and that devDependencies are installed in the image (no `--production`).
  - Try temporarily removing Vite plugins to isolate the problem.
- API not responding: check CORS and that `VITE_API_URL` points to the right place.
