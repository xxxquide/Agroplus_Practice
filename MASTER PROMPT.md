ROLE:
You are a senior full-stack product engineer + UI designer (billion-dollar SaaS polish). You must build a working web app (NOT mockups). Output real code with a clean repo structure, production conventions, and runnable locally.

PROJECT:
Name: "АГРОПЛЮС — Внутрішній портал" (AgroPlus Internal ERP Portal)
Goal: A modern internal ERP portal for agro-enterprise with authentication, dashboard widgets (weather, rates, diesel), reports upload/view/download, fields map with polygons + drawer details, warehouse inventory management with export.

IMPORTANT STYLE GOAL (MATCH THE REFERENCES):
The UI must visually feel like the provided images:
- Soft pastel gradient background (lavender/pink/ice) + subtle noise.
- “Glass” surfaces: large rounded rectangles (24–36px radius), blur backdrop, semi-transparent cards, thin borders.
- Split-view layout: left rail icons + left panel “results/feed” + right main panel “workspace/chat-like”.
- Floating bottom action dock (rounded pill) with quick actions (e.g., Files / Add / Export / Help).
- Calm, premium spacing, minimal outline icons, soft shadows, micro depth.
- Typography: Inter (or similar), crisp, modern.

TECH STACK (DO THIS EXACTLY):
- Next.js 15+ (App Router) + TypeScript
- TailwindCSS
- shadcn/ui (Radix) for base components
- lucide-react icons
- Prisma ORM
- SQLite for local dev (easy), ready to switch to Postgres
- Zod for validation
- TanStack Table for data tables
- Recharts for charts/sparklines
- MapLibre GL for map rendering (NO Google branding)
- Optional: mapbox-gl-draw (or compatible) for polygon drawing
- File upload stored locally in /uploads (and served safely)
- Authentication: simple credential auth with hashed password + session cookie (stateless signed cookie OR DB session table). Keep it secure enough for demo.

LANGUAGE:
- UI language: Ukrainian
- Keep labels EXACT, no gibberish. All strings readable.

DESIGN TOKENS (IMPLEMENT AS THE DESIGN SYSTEM):
- Base background: radial gradients + subtle overlay
  Example: 
  - bg: #F6F7FB base
  - gradient accents: #E9E6FF / #FCE7F3 / #E6FAF7
- Primary brand color: #005F73
- Secondary: #94D2BD
- Accent: #EE9B00
- Text: #1D3557
- Card surface: rgba(255,255,255,0.55) with backdrop-blur 18–24px, border rgba(255,255,255,0.35)
- Shadow: very soft, large blur, low alpha
- Radius: 28px for main panels, 20px for cards, 16px for inputs, 999px for pills
- Spacing grid: 8pt system

APP SHELL (MUST LOOK LIKE REFERENCES):
- Left vertical icon rail (rounded container) with 5–7 icons (Home, Fields, Warehouse, Reports, Settings, Help).
- Left “activity” panel showing recent items (like “Chat Results” vibe) with stacked glass cards.
- Right main panel (big glass sheet) with header (title + search + small actions) and content.
- Floating bottom dock inside right panel with 4–5 rounded action buttons.

ROUTING (PAGES):
- /login
- /dashboard
- /fields
- /warehouse
- /reports (optional page if you want to separate reports list; dashboard still shows latest)

DATA MODEL (PRISMA):
Create Prisma schema with at least:
- User: id, email/login, name, passwordHash, role, createdAt
- Report: id, fileNameOriginal, fileNameStored, mimeType, sizeBytes, category, uploadedByUserId, uploadedAt, tags (string), description
- Field: id, code (A1/B3), name, region, district, cropType, status, areaHa, sowingDate, yieldForecastTons, soilMoisturePct, lastInspectionAt, geometryGeoJSON (string)
- Machinery: id, name, type, status, updatedAt
- InventoryItem: id, name, category, quantity, unit, responsible, updatedAt, status (Enough/Low/Critical), minThreshold
- FuelPrice: id, fuelType (Diesel), priceUahPerL, updatedAt, source (Manual/API)
- Cache tables (optional): WeatherCache, RateCache for reducing API calls

SEED DATA:
- Create seed script that inserts:
  - Demo user: login "admin", password "admin123" (hashed)
  - 3–5 machinery items (tractor/combine/seeder)
  - 6–10 inventory rows
  - 5 reports entries (some PDF/XLSX placeholders) — if no real files exist, generate tiny placeholder files at seed time.
  - 6–10 fields with polygons (simple rectangles) in Vinnytsia region coordinates (approx), stored as GeoJSON.

REAL DATA INTEGRATIONS (WITH FALLBACK):
Weather:
- Use Open-Meteo API (no key), Vinnytsia coordinates, show next hours or next days.
- Cache response for 15 min in DB or memory.
Currency:
- Use NBU API for USD/EUR (or a stable public rates API). Cache 1 hour.
Fuel:
- Implement as internal manual update + optional API hook (but must work with manual).

FILES:
- Reports upload: accept PDF and XLSX.
- Store to /uploads with safe random name.
- Provide “Переглянути” (PDF viewer in modal) and “Завантажити” (download).
- Validate MIME, size limit (e.g., 20MB), sanitize names.

SECURITY:
- Protect all routes except /login.
- Use HTTP-only cookies for session.
- Basic RBAC roles: Admin/Manager/Viewer (at least in code).

UX REQUIREMENTS:
- Smooth loading skeletons for widgets
- Empty states with nice microcopy
- Toast notifications for actions
- Confirm dialogs for destructive actions
- Keyboard focus visible; accessible contrast; proper labels.

ENGINEERING QUALITY GATES:
- TypeScript strict
- ESLint
- Zod validation on inputs
- Server actions or API routes properly separated
- Reusable UI components
- Clean folder structure
- Provide README with setup steps (pnpm preferred)

DELIVERABLES:
1) Full repository code.
2) Prisma schema + migrations.
3) Seed script.
4) UI that matches the reference feel (glass, gradients, split view, dock).
5) All described pages functional.

NOW DO:
- Initialize Next.js project
- Add Tailwind + shadcn/ui
- Add Prisma + SQLite
- Build authentication
- Build app shell layout that matches references
- Create shared UI components: GlassPanel, GlassCard, IconRail, FloatingDock, KPIChip, StatusPill
- Prepare API utilities for weather/rates
- Add seed data
- Ensure everything runs with: pnpm install && pnpm dev, and seed with: pnpm prisma db push && pnpm prisma db seed
Return the full codebase structure and code files.
