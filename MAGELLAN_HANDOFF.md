# Harbor — Session Handoff Document
*Living document · Updated end of each session · Version 1.0 · Feb 26, 2026*

---

## How to use this document

At the start of every new conversation with Magellan (Claude), paste this file or share its GitHub link. It is the persistent memory of the project. At the end of each session, ask Magellan to generate an updated version.

**Workflow:** Magellan (this chat) handles architecture, design decisions, and generates precise instructions. Skipper (Claude Code in your terminal) executes those instructions directly in the codebase.

---

## 1. Project Vision

**App name (placeholder):** Harbor

**Core purpose:** Help any individual quickly understand their full financial position as a coherent whole — net worth and what it's made of — so they can make major financial decisions with confidence and calm.

**Emotional goal:** Calm through honest correctness. The product must never misrepresent data to "calm" the user. Colors, layout, and copy must not imply success vs failure, gain vs loss, or urgency.

**Target user (current "one-user / one-decision" focus)**
- Woman, mid-50s
- University-employed dentist (teaches + practices), salaried
- Medium-low financial anxiety
- Core decision: "What is my net worth?"

**"Aha" moment:** Within ~2 minutes of download, the user sees a directionally correct chart/number (with clear provenance), then begins relying on it for major financial decisions as part of routine.

**Explicit constraints:**
- Mobile-first (web optional later)
- No investment advice
- Not high-frequency trading/budgeting; daily updates desired for net worth state
- Early MVP prioritizes balance sheet state and visualization, not monthly spend analysis

---

## 2. Design System

### Visual Metaphor
Beachside landscape: Sand (stability), Water (resources), Earth (obligations), Pencil line (personal trajectory). The interface should feel like a quiet shoreline.

### Design Philosophy
- Calm through honest correctness
- No performance gamification, no "growth dopamine"
- Single-canvas feel: transitions should feel like zooming on one surface
- Progressive disclosure: overview first (Harbor/home), depth next (Depth screen), provenance detail last

### Typography
- Direction: ultra-modern app design (sleek sans serif) with institutional sturdiness
- Not yet locked to a specific font family

### Color System
All colors live in `apps/mobile/src/theme.ts`. Never use hardcoded hex values in components.

**Environment (Foundation)**
| Token | Value | Purpose |
|-------|-------|---------|
| color.bg.base | #F3E7D3 | Sandy tan background |
| color.bg.card | rgba(255,255,255,0.30) | Frosted surface / card |
| color.bg.cardRaised | rgba(255,255,255,0.55) | Raised card surface |
| color.text.primary | #27231C | Warm charcoal |
| color.text.secondary | rgba(39,35,28,0.65) | Secondary text |
| color.text.tertiary | rgba(39,35,28,0.42) | Tertiary/hint text |
| color.border.default | rgba(39,35,28,0.10) | Dividers |
| color.border.emphasis | rgba(39,35,28,0.16) | Baseline/grid lines |
| color.netWorth.line | #5B4A3A | Pencil — net worth line |
| color.netWorth.subtle | rgba(91,74,58,0.15) | Net worth area fill |

**Color Scales (replaces per-category tokens)**
Colors are interpolated across scales based on number of categories in each group.

| Scale | From | To | Used for |
|-------|------|----|---------|
| assetShortTerm | #A9D6CF | #7FB3C8 | cash, brokerage |
| assetLongTerm | #C8B89A | #8A6F4E | retirement, real_estate, vehicle, business_ownership, other |
| liabilityShortTerm | #D4B89A | #C49A86 | credit_card, personal_loan, taxes_owed, other |
| liabilityLongTerm | #8B6347 | #4A2E1A | mortgage, student_loan, auto_loan |

### Master Category Order (CATEGORY_ORDER in theme.ts)
Single source of truth for both chart stacking and Depth screen list order.
Short-term first (top of chart / top of list), long-term closest to x-axis.

**Assets (top → bottom in chart, top → bottom in Depth):**
cash → brokerage → retirement → real_estate → vehicle → business_ownership → other

**Liabilities (top → bottom in chart, top → bottom in Depth):**
credit_card → personal_loan → taxes_owed → mortgage → student_loan → auto_loan → other

### Legend
Horizontal gradient bar below the chart. Mirrors chart stacking order:
- Left to right: short-term assets → long-term assets | long-term liabilities → short-term liabilities
- Center point of gradient = x-axis
- Color stops: #7FB3C8, #C8B89A, #8A6F4E, #8B6347, #4A2E1A, #D4B89A
- Labels: "Short / Long" under Assets, "Long / Short" under Liabilities

---

## 3. Technical Stack

**Monorepo:** npm workspaces, repo at github.com/carsontshaner/netWorthApp

**Structure:**
- `apps/mobile` — Expo (React Native) + TypeScript, Expo Router
- `apps/web` — later
- `services/api` — Node.js + TypeScript + Express + PostgreSQL
- `packages/shared` — shared domain types and enums
- `packages/ui` — shared UI primitives
- `infra` — later

**Key dependencies:**
- `react-native-svg` — SVG chart rendering
- `expo-linear-gradient` — gradient fills and fades
- `expo-router` — file-based routing
- `pg` — PostgreSQL pool

**Auth:** Currently placeholder middleware reading `x-user-id` header (hardcoded "user_1")

**Database:** PostgreSQL, local. Connection via `DATABASE_URL` env variable.
Local connection string format: `postgres://postgres:PASSWORD@localhost:5432/finance_clarity`

**Windows note:** Use PowerShell for env variables: `$env:DATABASE_URL="..."; npm run ...`
Git Bash causes issues — always use PowerShell in VS Code terminal.

**Running locally:**
- API: `npm run api:dev` (from repo root)
- Mobile: `npm run mobile:start` (from repo root)
- Seed DB: `$env:DATABASE_URL="..."; npm run seed --workspace @finance-clarity/api`

---

## 4. Data Model

**Core principle:** Assets and liabilities are the truth layer. Accounts are provenance.

**Positions** — individual asset or liability items
- `side`: 'asset' | 'liability'
- `category`: AssetCategory | LiabilityCategory enum value (snake_case)
- `source_type`: 'manual' | 'connected_account' | 'imported_statement'
- Multiple positions per category supported (e.g. 2 cars, 3 properties)

**Valuation Snapshots** — daily values per position
- Stored as positive numbers for both assets and liabilities
- Liabilities rendered below baseline in the UI, never in the DB

**Key data rules:**
- Net worth = assets − liabilities (never stored, always derived)
- Liabilities stored positive, rendered negative
- Carry-forward fills missing days (API-side, not client-side)

---

## 5. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /health | Health check |
| POST | /positions | Create position |
| GET | /positions | List user's positions |
| PATCH | /positions/:id | Update position |
| POST | /snapshots | Upsert daily snapshot |
| GET | /chart/networth | Daily net worth series (from/to params) |
| GET | /chart/composition | Daily per-category series for stacked chart |
| GET | /composition/summary | Latest values grouped by category for Depth screen |

---

## 6. Screen Architecture

### Home Screen (Harbor)
- "Harbor" label (large, light weight, centered)
- Net worth number (centered, large)
- Full-width stacked area chart with:
  - Per-category colored bands above (assets) and below (liabilities) baseline
  - White border lines between bands
  - Net worth polyline with white halo and shading below
  - Charcoal x-axis line on top of all fills
  - Left fade (LinearGradient)
  - Tappable — navigates to Depth screen
- Legend (gradient bar + labels) below chart
- "See depth →" link
- "Updated today" text
- ScrollView wrapping all content

### Depth Screen (formerly Composition)
- Title: "Depth"
- Back button: "Chart"
- Left edge: vertical LinearGradient strip (4px wide, full height from first content item)
  - Same color stops as legend, top-to-bottom direction
- Category groups sorted by CATEGORY_ORDER
- Each position row: color dot + name + value (or "—" for null)
- ScrollView, showsVerticalScrollIndicator: false, paddingBottom: 40

---

## 7. Current Backlog

### P1 — Complete ✅
- [x] Composition/Depth screen wired to real data
- [x] Harbor branding (APP_NAME constant, not hardcoded)
- [x] Net worth number centered
- [x] Chart background blends into home screen
- [x] Back button label "Chart"
- [x] "Balance sheet" label removed from Depth screen
- [x] Rename Composition → Depth throughout
- [x] "See composition →" → "See depth →"

### P2 — In Progress / Next
- [ ] Zoom transition: tapping chart / "See depth →" should feel like zooming in on the last data point, not a screen push. Requires Reanimated 2 shared element transition.
- [ ] Chart full-width bleed — still not extending fully to screen edges on all devices. Needs further investigation.

### P3 — Planned
- [ ] All-time chart range (replace hardcoded 30-day window with full history + zoom gesture)
- [ ] useWindowDimensions already implemented for chart height; verify width is truly full-screen
- [ ] Color tokenization complete — verify all hardcoded hex values replaced across all files
- [ ] Typography — lock font family, implement across app
- [ ] Real estate "earthy" tone review — currently sits in assetLongTerm scale, may need its own treatment

### Future Scope (post-MVP)
- [ ] Plaid connected accounts integration
- [ ] Manual vs connected conflict resolution UI
- [ ] Custom "other" category creation by users
- [ ] Real auth (magic link / passkeys)
- [ ] Passwordless onboarding flow
- [ ] Production architecture (hosting, CI/CD, observability)
- [ ] Expense / financial wellbeing expansion
- [ ] Dark mode

---

## 8. Open Design Questions

- **Zoom transition mechanics:** Exact animation approach for Home → Depth. Shared element? Custom interpolation? Decision pending.
- **Depth screen composition dots:** Currently using categoryColor(category, side, 0, 1) for midpoint of scale. Should these eventually match the exact shade used in the chart for that category?
- **Net worth number on Depth screen:** Currently only on Home. Should Depth also show the net worth figure? Where?
- **Real estate color treatment:** Currently interpolated within assetLongTerm scale. May deserve its own earthy color family separate from the water tones.
- **Chart timeframe label:** When all-time range is implemented, a label showing the date range will be needed. Placement TBD.
- **Empty state:** What does the app show on first launch before any data exists? Onboarding flow not yet designed.
- **"Updated today" text:** Currently hardcoded. Should reflect actual last snapshot date.

---

## 9. Known Debt

- `x-user-id: "user_1"` hardcoded in `apps/mobile/src/api.ts` — replace with real auth
- `NetWorthPoint` type defined twice with different casing (snake_case in api.ts, camelCase in shared) — should be unified
- Seed data in DB is random walk test data — not real user data
- Chart width may not be truly full-screen on all device sizes
- No error boundaries around API calls beyond basic try/catch
- No environment config system (dev vs prod API base URL)

---

## 10. Session Log

### Session 1 — Feb 26, 2026
**Accomplished:**
- Full project onboarding from Atlas handoff document
- Reviewed entire codebase (index.tsx, balance-sheet-chart.tsx, composition.tsx, server.ts, api.ts, shared types)
- Built /composition/summary API endpoint
- Wired Depth screen to real data
- P1 UI polish complete (Harbor branding, chart background, back button, title cleanup)
- Color token system (theme.ts) with color scales and CATEGORY_ORDER
- Stacked per-category chart with /chart/composition endpoint
- Legend with gradient mirroring chart stacking order
- Net worth line halo and shading
- Charcoal x-axis line
- Category color dots on Depth screen
- Left gradient border on Depth screen
- Chart tap to navigate to Depth
- ScrollView on both screens
- Seed script with 12 positions and 60 days of random walk data

**Left off at:**
Skipper implementing: net worth line thicker, x-axis more prominent, CATEGORY_ORDER master alignment, Depth gradient border start offset. Commit and push to GitHub pending.

**Immediate next session:**
- Verify final Skipper changes look correct on device
- Commit and push to GitHub
- Begin P2 zoom transition

---

*End of handoff document. Regenerate at end of each session.*
