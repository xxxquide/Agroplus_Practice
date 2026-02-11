# AgroPlus Portal

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.2-2d3748?style=for-the-badge&logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38b2ac?style=for-the-badge&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)

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
> <img src="icons/diagram.jpeg" />
```mermaid
graph TB
    classDef client fill:#1976d2,stroke:#0d47a1,stroke-width:3px,color:#ffffff
    classDef vpn fill:#388e3c,stroke:#1b5e20,stroke-width:3px,color:#ffffff
    classDef server fill:#f57c00,stroke:#e65100,stroke-width:3px,color:#ffffff
    classDef db fill:#7b1fa2,stroke:#4a148c,stroke-width:3px,stroke-dasharray:5 5,color:#ffffff
    classDef blocked fill:#d32f2f,stroke:#b71c1c,stroke-width:3px,stroke-dasharray:5 5,color:#ffffff

    subgraph CLIENT_ZONE["💻 Клієнтська зона"]
        Browser["🌐 Веб-браузер<br/>URL: http://agro.corp:3000"]
        OS_Net["⚙️ OS Network Stack<br/>Hosts: 172.31.x.x"]
        VPN_Client["🛡️ OpenVPN Connect<br/>Interface: tun0"]
        
        Browser -->|"1. HTTP Request"| OS_Net
        OS_Net -->|"2. Маршрутизація"| VPN_Client
    end

    subgraph INTERNET["🌐 Інтернет"]
        Tunnel["🔒 Encrypted Tunnel<br/>UDP/TCP"]
        Hacker["👤 Hacker / Scanner"]
    end

    subgraph AWS_CLOUD["☁️ AWS Cloud"]
        subgraph FIREWALL["🛡️ AWS Security Group"]
            Port_VPN["✅ Port 1194/943<br/>OpenVPN"]
            Port_App["❌ Port 3000<br/>BLOCKED"]
            Port_DB["❌ Port 5432<br/>BLOCKED"]
        end
        
        subgraph SERVER["🔒 Внутрішній сервер"]
            VPN_Server["🖥️ OpenVPN Server<br/>Gateway"]
            
            subgraph APP["Application Stack"]
                PM2["⚡ PM2 Manager"]
                NextJS["▲ Next.js<br/>Port: 3000"]
                Middleware["🔐 VPN Guard"]
            end
            
            subgraph DATA["Data Layer"]
                Prisma["📦 Prisma ORM"]
                Postgres[("🗄️ PostgreSQL<br/>127.0.0.1:5432")]
                FileSystem["📁 /uploads"]
            end
        end
    end

    VPN_Client ==>|"3. Encrypted"| Tunnel
    Tunnel ==>|"4. VPN Packet"| Port_VPN
    Port_VPN --> VPN_Server
    VPN_Server -->|"5. Decrypted"| PM2
    PM2 --> NextJS
    NextJS -->|"6. Check"| Middleware
    Middleware -->|"7. Logic"| Prisma
    Prisma <-->|"8. SQL"| Postgres
    NextJS <-->|"9. Files"| FileSystem

    Hacker -.->|"❌ Attack"| Port_App
    Hacker -.->|"❌ Brute Force"| Port_DB

    class Browser,OS_Net,VPN_Client client
    class VPN_Server,Tunnel vpn
    class PM2,NextJS,Middleware,Prisma,FileSystem server
    class Postgres db
    class Hacker,Port_App,Port_DB blocked
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
