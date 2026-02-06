TASK:
Implement /fields page: “Поля — Інтерактивна карта” as a real working GIS-like internal tool with MapLibre, polygons, selection highlight, filters, and field details drawer. Match reference glass UI.

LAYOUT (REFERENCE-STYLE):
- Same app shell: icon rail + left activity panel + right main glass panel.
- Right panel header:
  - Title “Поля”
  - Subtitle “Інтерактивна карта”
  - Search: “Пошук поля…”
  - Small actions: “Додати поле” (accent)

MAIN SPLIT:
Left (inside right panel):
- Glass filter card:
  - Search input: “Пошук поля…”
  - Dropdowns: “Культура”, “Статус”, “Район”, “Рік”
  - Toggle: “Показувати техніку на мапі”
  - Button: “Додати поле” (accent)
  - Button secondary: “Імпорт GeoJSON” (optional but nice)
Right:
- Large map canvas in glass frame (rounded 28px).
- Use MapLibre + OpenStreetMap tiles (no Google). Make it clean, slightly muted colors.

MAP CONTENT:
- Render polygon fields from DB (Field.geometryGeoJSON).
- Styling:
  - Outline: primary #005F73
  - Fill: secondary with low opacity
  - Hover: increase opacity + subtle glow
  - Selected field: outline accent #EE9B00 + slightly brighter fill
- Labels:
  - “Поле A1”, “Поле B3” etc as small chips near centroid (or in a tooltip).
- Optional: show machinery markers when toggle on (mock markers from seed).

INTERACTION:
- Click polygon => open right-side details drawer (glass drawer) OR floating popup + drawer:
Drawer content (Ukrainian, exact keys):
  - “Поле: A1”
  - “Культура: Пшениця”
  - “Посів: 10.04.2024”
  - “Прогноз врожаю: 50 т”
  - “Площа: 120 га”
  - “Вологість ґрунту: 23%”
  - “Останній огляд: 2 дні тому”
Actions:
  - Button: “Відкрити звіт” (shows related reports by tag/field code)
  - Button: “Додати задачу” (opens modal; store in optional Task table or mock for now)

ADD FIELD:
- “Додати поле” opens modal wizard:
  1) Basic info (код, культура, статус, район)
  2) Draw polygon on map (use draw tool)
  3) Preview + save
- Save geometry in DB as GeoJSON string.
- Validate polygon.

FILTERS:
- Filter polygons by crop/status/district/year.
- Search by code/name.

PERFORMANCE:
- Use memoization for GeoJSON sources.
- Keep map state stable across rerenders.

QUALITY:
- Super clean GIS-like feel: subtle terrain hints allowed (but no heavy).
- Perfect alignment.
- No external branding.

ACCEPTANCE:
- Fully interactive: click => highlight => drawer details.
- Add field works (create polygon and appears instantly).
- Filters work.
- UI looks premium and matches reference glass style.
