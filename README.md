# AgroPlus Portal

> Внутрішній операційний портал для агробізнесу. Сайт доступний тільки через OpenVPN, база даних працює локально на сервері, без зовнішніх хмар.

## Зміст

- [Паспорт системи](#паспорт-системи)
- [Суть проєкту](#суть-проєкту)
- [Модулі системи](#модулі-системи)
- [Архітектура](#архітектура)
- [Шлях запиту: 5 етапів](#шлях-запиту-5-етапів)
- [Діаграма шляху запиту](#діаграма-шляху-запиту)
- [Ешелонований захист](#ешелонований-захист)
- [Карта сторінок](#карта-сторінок)
- [Технологічний стек](#технологічний-стек)
- [Локальний запуск](#локальний-запуск)
- [Деплой на сервер (PM2)](#деплой-на-сервер-pm2)
- [OpenVPN і доступ](#openvpn-і-доступ)
- [Структура проєкту](#структура-проєкту)
- [Скрипти](#скрипти)
- [Безпека](#безпека)

## Паспорт системи

| Параметр | Значення |
|---|---|
| Доступ | Тільки через OpenVPN |
| VPN протокол | OpenVPN (`UDP 1194`) |
| Порт застосунку | `3000` (закритий для інтернету) |
| Процес‑менеджер | `PM2` |
| Рантайм | `Node.js 20` |
| Backend | `Next.js Route Handlers` |
| ORM | `Prisma` |
| База | `PostgreSQL` тільки `localhost` |
| Файли | локальне сховище на сервері (`uploads`) |
| Репозиторій | GitHub (pull + build + restart) |

## Суть проєкту

Я створив систему, яка зводить операційні процеси агробізнесу в одне вікно.

- Поля: карта, геометрія, задачі, статуси.
- Склад: облік, списання, історія руху.
- Звіти: upload `PDF/XLSX`, імпорт, привʼязка до користувача.
- Користувачі: ролі, активність, профіль, налаштування.
- Підтримка: тікети, пріоритети, вкладення.
- Сповіщення: системні події у реальному робочому потоці.

## Модулі системи

| Модуль | Як працює | Сутності |
|---|---|---|
| `Dashboard` | KPI, погода, паливо, курси, прогнози | `YieldForecast`, `Machinery`, `Notification` |
| `Fields` | Інтерактивна карта та задачі по полях | `Field`, `FieldTask` |
| `Warehouse` | Складські позиції, історія, списання | `InventoryItem`, `InventoryLog` |
| `Reports` | Завантаження, парсинг XLSX, файли на сервері | `Report` |
| `Users` | Користувачі, ролі, активність | `User` |
| `Support` | Тікети, пріоритети, вкладення | `SupportTicket`, `SupportAttachment` |
| `Profile / Settings` | Персональні параметри користувача | `User.profileData`, `User.settingsData` |

## Архітектура

```mermaid
flowchart TB
  subgraph C["Клієнт"]
    LAP["Ноутбук / Браузер"]
    OVPNC["OpenVPN Connect"]
    LAP --> OVPNC
  end

  subgraph NET["Транспорт"]
    INET["Інтернет"]
  end

  subgraph AWS["AWS VPS"]
    SG["Security Group\n(відкритий лише VPN порт)"]
    OVPNS["OpenVPN Server"]
    PM2["PM2"]
    NEXT["Next.js"]
    MW["Middleware\nVPN_ALLOWLIST + session"]
    PRISMA["Prisma ORM"]
    PG["PostgreSQL (localhost)"]
    OVPNS --> PM2
    PM2 --> NEXT
    NEXT --> MW
    NEXT --> PRISMA
    PRISMA --> PG
  end

  OVPNC --> INET --> SG --> OVPNS
```

## Шлях запиту: 5 етапів

### Етап 1. Ініціація (мій ноутбук)

Я відкриваю браузер і йду на внутрішню адресу сервера. Це адреса з приватної AWS‑мережі. OpenVPN Connect бере HTTP‑запит, шифрує його і відправляє через VPN‑порт на публічний IP сервера.

### Етап 2. Прохідна (AWS)

Security Group пропускає тільки VPN‑трафік. OpenVPN Server розшифровує пакет і бачить оригінальний запит до `localhost:3000`.

### Етап 3. Веб‑додаток (Next.js + PM2)

PM2 тримає сайт активним. Next.js приймає запит, перевіряє сесію і `VPN_ALLOWLIST`. Якщо все ок — рендерить сторінку.

### Етап 4. Дані (Prisma + PostgreSQL)

Prisma переводить запит з TypeScript у SQL. PostgreSQL працює тільки на `localhost` і не відкритий назовні. Дані читаються з диску сервера і повертаються назад у застосунок.

### Етап 5. Відповідь

Next.js формує HTML, OpenVPN шифрує відповідь, і на моєму ноутбуці зʼявляється сторінка.

## Діаграма шляху запиту

```mermaid
sequenceDiagram
  participant L as Ноутбук (браузер)
  participant C as OpenVPN Connect
  participant I as Інтернет
  participant S as OpenVPN Server (AWS)
  participant P as PM2
  participant N as Next.js
  participant M as Middleware
  participant R as Prisma
  participant D as PostgreSQL (localhost)

  L->>C: HTTP запит до внутрішньої адреси
  C->>I: Шифрований VPN пакет
  I->>S: UDP 1194
  S->>P: Розшифрований запит
  P->>N: Передача у Next.js
  N->>M: Перевірка сесії + VPN_ALLOWLIST
  M->>R: Запит у Prisma
  R->>D: SQL запит
  D-->>R: Дані
  R-->>N: Результат
  N-->>S: HTML відповідь
  S-->>I: Зашифрована відповідь
  I-->>C: VPN трафік
  C-->>L: Рендер у браузері
```

## Ешелонований захист

1. Мережевий рівень: порт сайту і БД не доступні з інтернету, тільки через VPN.
2. Транспортний рівень: весь трафік шифрований.
3. Прикладний рівень: middleware перевіряє сесію та `VPN_ALLOWLIST`.

База локальна, не залежить від зовнішніх хмар. Дані повністю під контролем компанії.

## Карта сторінок

```mermaid
flowchart LR
  LOGIN["/login"] --> DASH["/dashboard"]
  DASH --> FIELDS["/fields"]
  DASH --> WAREHOUSE["/warehouse"]
  DASH --> REPORTS["/reports"]
  DASH --> USERS["/users"]
  DASH --> SUPPORT["/support"]
  DASH --> PROFILE["/profile"]
  DASH --> SETTINGS["/settings"]
```

## Технологічний стек

| Шар | Технології |
|---|---|
| UI | `Next.js 15`, `React 19`, `Tailwind CSS`, `MapLibre`, `Recharts` |
| Backend | `Next.js Route Handlers`, `Prisma` |
| Data | `PostgreSQL (local)`, файлове сховище на сервері |
| Runtime | `Node.js 20` |
| Process | `PM2` |
| Network | `OpenVPN` |
| QA | `Vitest`, `Playwright` |

## Локальний запуск

1. Встановлюю залежності.
```bash
pnpm install
```

2. Створюю `.env` із шаблону.
```bash
cp .env.example .env
```

3. Заповнюю ключові змінні: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `VPN_ALLOWLIST`.

4. Синхронізую схему з БД.
```bash
pnpm db:push
```

5. За потреби заливаю демо‑дані.
```bash
pnpm db:seed
```

6. Підіймаю застосунок.
```bash
pnpm dev
```

## Деплой на сервер (PM2)

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 start npm --name agroplus -- start -- -p 3000 -H 0.0.0.0
pm2 save
```

## OpenVPN і доступ

- VPN — єдиний канал доступу до сайту.
- Security Group відкриває тільки VPN‑порт.
- База слухає лише `localhost`.

Приклад `VPN_ALLOWLIST`:

```env
VPN_ALLOWLIST="10.8.0.0/24,203.0.113.10/32"
```

## Структура проєкту

### Архітектурна карта директорій

```mermaid
flowchart LR
  subgraph UI["UI Layer"]
    APP["app/* pages"]
    CMP["components/*"]
    ICO["icons/*"]
  end

  subgraph APPLOGIC["Application Layer"]
    API["app/api/*"]
    MID["middleware.ts"]
  end

  subgraph DOMAIN["Domain Layer"]
    LIB["lib/*"]
  end

  subgraph DATA["Data Layer"]
    PRI["prisma/*"]
    UP["uploads/*"]
  end

  APP --> CMP
  APP --> API
  MID --> API
  API --> LIB
  LIB --> PRI
  API --> UP
```

### Дерево і роль кожної частини

```text
.
├── app/                         # сторінки, layout, route handlers
│   ├── api/                     # backend endpoints
│   ├── dashboard/               # оперативна панель
│   ├── fields/                  # карта полів і задачі
│   ├── warehouse/               # склад і рух залишків
│   ├── reports/                 # звіти і upload UI
│   ├── users/                   # користувачі та ролі
│   ├── support/                 # тікети підтримки
│   ├── profile/                 # профіль
│   └── settings/                # налаштування
├── components/
│   ├── ui/                      # універсальні UI-компоненти
│   └── branding/                # бренд-елементи
├── icons/                       # іконки проєкту
├── lib/                         # доменна логіка, auth, db, утиліти
├── prisma/
│   ├── schema.prisma            # модель даних
│   └── seed.ts                  # стартові дані
├── scripts/                     # технічні скрипти
├── tests/
│   ├── unit/                    # unit тести
│   └── e2e/                     # end-to-end тести
├── uploads/                     # локальні завантаження/файли звітів
├── middleware.ts                # контроль доступу (session + VPN allowlist)
└── README.md                    # документація проєкту
```

### Де я додаю новий функціонал

| Що додаю | Куди додаю |
|---|---|
| Нова сторінка | `app/<feature>/page.tsx` |
| Новий API endpoint | `app/api/<feature>/route.ts` |
| Нова бізнес‑логіка | `lib/<feature>.ts` |
| Нова таблиця / звʼязок | `prisma/schema.prisma` + міграція |
| Нові UI‑примітиви | `components/ui/*` |
| Новий e2e сценарій | `tests/e2e/*` |
| Новий unit‑тест | `tests/unit/*` |

## Скрипти

- `pnpm dev` - локальна розробка
- `pnpm build` - production build
- `pnpm start` - запуск production
- `pnpm lint` - перевірка ESLint
- `pnpm prisma` - Prisma CLI
- `pnpm db:push` - синхронізація схеми без міграцій
- `pnpm db:seed` - початкові демо‑дані
- `pnpm test:unit` - unit‑тести
- `pnpm test:e2e` - e2e‑тести
- `pnpm test` - повний прогін тестів

## Безпека

- `.env` не потрапляє в Git.
- База даних ізольована на `localhost`.
- VPN — єдиний публічний вхід у систему.
- Middleware перевіряє сесії та дозволені IP.
