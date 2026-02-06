# АГРОПЛЮС — Внутрішній портал

## Setup
1. Install dependencies:
   - `pnpm install`
2. Configure environment:
   - Copy `.env.example` to `.env` and set `AUTH_SECRET`.
3. Create the database and seed demo data:
   - `pnpm prisma db push`
   - `pnpm prisma db seed`
4. Run the app:
   - `pnpm dev`

## Demo Credentials
- Login: `admin`
- Password: `admin123`
