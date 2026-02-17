# Finance Clarity App (WIP)

## Repo Structure
- apps/mobile — React Native (Expo) mobile app (primary)
- apps/web — Web (later)
- services/api — Backend API (Node/TypeScript)
- services/worker — Scheduled jobs (later)
- packages/shared — Shared domain types/enums
- packages/ui — Shared UI primitives
- infra — Deployment/config (later)

## Backend bootstrap included in this milestone
- Manual-first balance sheet model using **assets** and **liabilities**.
- Position valuation snapshots with required provenance (`source_type`, `source_details`).
- Net worth chart data computed as `assets_total - liabilities_total`.

## Local development

### 1) Install dependencies
```bash
npm install
```

### 2) Configure Postgres
Set a local connection string before running the API:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/finance_clarity"
```

### 3) Apply SQL migrations
Run SQL files in `services/api/migrations` in order (`001_init.sql`, then `002_indexes.sql`).

Example with psql:
```bash
psql "$DATABASE_URL" -f services/api/migrations/001_init.sql
psql "$DATABASE_URL" -f services/api/migrations/002_indexes.sql
```

### 4) Run API in dev mode
```bash
npm run api:dev
```

### 5) Typecheck API
```bash
npm run api:typecheck
```

## API surface (current milestone)
- `GET /health`
- `POST /positions`
- `GET /positions`
- `PATCH /positions/:id`
- `POST /snapshots`
- `GET /chart/networth?from=YYYY-MM-DD&to=YYYY-MM-DD`

Auth is currently a placeholder middleware that reads `x-user-id` from request headers.
