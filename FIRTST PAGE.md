TASK:
Implement /login page (Authorization) for “АГРОПЛЮС — Внутрішній портал” with the exact reference-style UI: big rounded glass panels, pastel gradient background, subtle noise, clean Inter type.

VISUAL LAYOUT (MATCH REFERENCES):
- Full viewport background: soft radial gradients (lavender/pink/ice), subtle grain/noise overlay (CSS).
- Center-right large “glass sheet” panel (rounded 32px) like the reference’s main panel.
- Left side mini “preview panel” (optional) that shows 2–3 glass cards (like “activity/results”), purely decorative but consistent with app shell style.
- Inside the main glass panel:
  - Header row: abstract logo (wheat + shield) + “АГРОПЛЮС” + “Внутрішній портал”
  - Big greeting line (like reference): “Вітаємо!” and subtitle “Увійдіть до системи”
  - Form card: two inputs with soft inner shadow (Логін, Пароль)
  - Primary button “Увійти” (accent #EE9B00) with hover, focus ring
  - Secondary link “Забули пароль?”
  - Small security note: “Доступ лише через корпоративний VPN”
  - Footer: “© АГРОПЛЮС • Тільки для внутрішнього використання”

FUNCTIONAL REQUIREMENTS:
- Login with credentials:
  - Username field accepts “admin” for seeded admin.
  - Password “admin123”.
- On success:
  - Create session cookie (HTTP-only).
  - Redirect to /dashboard.
- On fail:
  - Show inline error in Ukrainian + toast.
- Add “show password” eye icon.
- Add loading state on submit.
- Add form validation with Zod:
  - required fields, min length.

ENGINEERING:
- Use Next.js App Router:
  - app/login/page.tsx
  - server action for login OR /api/auth/login route.
- Password hashing with bcrypt.
- Session:
  - Option A: DB sessions table
  - Option B: Signed cookie token (HMAC) with user id + expiry
Choose one and implement properly.

STYLE DETAILS:
- Inputs: rounded 16px, semi-transparent background, border white/35, focus ring primary.
- Buttons: subtle shadow, smooth transitions, disabled state.
- Use a reusable GlassCard component.
- No stock photos, no external branding.

ACCEPTANCE:
- Looks like a real SaaS login.
- Matches reference vibe (glass panels, big radii, calm gradients).
- Works end-to-end: seed -> login -> redirect.
