TASK:
Implement /warehouse page “Складський облік” as a real working inventory module with a premium admin table, filters, status pills, CRUD actions, and Excel export. Match the reference glass UI.

LAYOUT (REFERENCE-STYLE):
- Same app shell (icon rail + left activity panel + right main panel).
- Breadcrumb (soft): “Склад / Warehouse”
- Title: “Складський облік”
- Controls row (glass strip):
  - Search input “Пошук ресурсу…”
  - Filters dropdowns: “Категорія”, “Одиниця”, “Відповідальний”
  - Primary button (accent): “Додати ресурс”
  - Secondary: “Експорт (Excel)”

MAIN TABLE (TanStack Table):
Columns (Ukrainian, exactly):
- “Назва ресурсу”
- “Кількість на складі”
- “Одиниця виміру”
- “Відповідальний”
- “Оновлено”
- “Статус”

ROWS (seed минимум + реалистично):
- “Селітра” — unit “т” — responsible “Іваненко О.”
- “Гербіциди” — unit “л” — responsible “Петренко М.”
- “Паливо (дизель)” — unit “л” — responsible “Склад №1”
+ 3–5 more: “Насіння кукурудзи”, “ЗЗР”, “Мастила”, etc.
Status pills:
- “Достатньо” (green)
- “Низький запас” (amber)
- “Критично” (red)
At least one row highlighted as low stock.

TABLE UX POLISH:
- Sticky header
- Row hover state
- Sorting on columns
- Pagination bottom right
- Inline quick actions per row (3-dot menu):
  - “Редагувати”
  - “Списати”
  - “Історія”
  - “Видалити”

RIGHT SIDE SUMMARY (inside right panel):
Create a vertical stack of glass mini cards:
- “Критичні позиції” (count)
- “Загальна вартість запасів” (demo value, later editable)
- “Останні надходження” (tiny list)
- Optional: “Останні списання”

CRUD:
- “Додати ресурс” modal:
  - name, category, quantity, unit, responsible, minThreshold
  - auto status derived from thresholds
- “Редагувати” modal
- “Списати” modal:
  - amount to subtract, reason
  - prevent negative values
- Track updates:
  - updatedAt changes
  - optional InventoryLog table for history (recommended)

EXPORT:
- “Експорт (Excel)” generates .xlsx using SheetJS:
  - export current filtered view
  - include timestamp in filename
- Show toast “Експортовано успішно”.

VALIDATION:
- Zod schemas for forms.
- Server-side validation for safety.

QUALITY:
- Premium glass admin table like a top product designer.
- Crisp Ukrainian.
- No clutter.

ACCEPTANCE:
- Inventory fully functional.
- Export works.
- Summary cards reflect real data.
- Looks consistent with the whole design system.
