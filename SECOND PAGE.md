TASK:
Implement /dashboard page (Оперативна панель) with a fully working UI and real data integrations (with caching + fallback). Must match reference style: split view, glass cards, floating dock.

APP SHELL (MUST EXIST ON THIS PAGE):
- Left icon rail (fixed): Home, Поля, Склад, Звіти, Налаштування, Допомога
- Left “activity panel” shows:
  - “Сьогодні” section with 1–2 cards (e.g., last report uploaded, alert low stock)
  - “Вчора” section with smaller cards
- Right main glass panel contains the dashboard content.
- Floating bottom dock inside right panel with actions:
  - “Додати звіт”
  - “Додати ресурс”
  - “Оновити дані”
  - “Експорт”
  - “Підтримка”

HEADER (RIGHT PANEL):
- Title: “Оперативна панель”
- Search input: placeholder “Пошук…”
- Small icon buttons: bell (notifications), help, user menu (initials)

TOP KPI ROW:
Create 4 KPI chips (glass mini cards):
- “Площа під посівами” (sum of Field.areaHa)
- “Активні поля” (count status Active)
- “Заплановані роботи” (for now mock count from seed or Tasks table optional)
- “Ризик погоди” (derived from forecast: if rain or wind above threshold => show amber)

WIDGETS (REAL + WORKING):
1) WEATHER (Vinnytsia):
- Card title: “Погода (Вінниця)”
- Use Open-Meteo:
  - coordinates ~ 49.2331, 28.4682
  - show next 5 time slots or next 5 days (icons + temp)
  - show summary row: “Вітер • Вологість • Опади”
- Implement caching 15 min (DB or memory).
- Loading skeleton.
- If API fails: show fallback “Немає звʼязку, показано останні дані” + cached.

2) CURRENCY & FUEL:
- Card title: “Курс валют / Паливо”
- Rates: USD, EUR from NBU API (cache 60 min).
- Diesel:
  - show current price from FuelPrice table (manual update default from seed)
  - provide small “Оновити” icon which opens modal to set diesel price manually (Admin only; but keep visible for demo).
- Add tiny sparkline (Recharts) for last 7 points:
  - For rates: store historical points in RateCacheHistory table OR generate from seed for demo.
  - For diesel: keep last manual updates.

3) MACHINERY STATUS TABLE:
- Card title: “Статус техніки”
- Table rows in Ukrainian with StatusPill:
  - “Трактор №1 — В роботі” (green)
  - “Комбайн №3 — На ремонті” (amber/red)
  - “Сівалка №2 — В простої” (gray)
  - Add 2–3 more from seed.
- Include “Оновлено: …” time.

4) LATEST REPORTS:
- Card title: “Останні звіти”
- Show list of 5 latest reports from DB:
  - file icon (PDF/XLSX), file name, uploader (“Бухгалтерія” or actual user), timestamps
  - buttons: “Переглянути” (PDF modal viewer OR open details drawer) and “Завантажити”
- Also include “Завантажити звіт” button that opens upload modal (reused later).

5) YIELD FORECAST CHART:
- Card title: “Прогноз врожайності”
- Simple clean chart (line or bar) using Recharts.
- Data based on Field.yieldForecastTons aggregated by crop or by month.
- Must be minimal and pretty (no messy axes).

ENGINEERING:
- Use server components for initial data fetch (Prisma).
- Use API routes for external fetch (weather/rates) + caching.
- Use Suspense/loading states.
- Implement toasts for actions.

QUALITY:
- Everything consistent: spacing, radii, glass.
- Crisp Ukrainian text.
- No clutter, no random placeholder gibberish.

ACCEPTANCE:
- Dashboard fully functional with real fetch + cache + fallback.
- Upload reports works (even from dashboard modal).
- Looks like the reference vibe (split view + dock).
