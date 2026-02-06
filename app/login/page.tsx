import { AgroPlusLogo } from "@/components/branding/AgroPlusLogo";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-aurora noise-overlay relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-10 h-72 w-72 rounded-full bg-[#E9E6FF]/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-80 w-80 rounded-full bg-[#FCE7F3]/70 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center gap-8 px-6 py-12">
        <aside className="hidden w-[260px] flex-col gap-4 lg:flex">
          <GlassCard className="p-4">
            <p className="text-xs text-ink/60">Останні дії</p>
            <p className="mt-2 text-sm font-semibold">Звіт урожайності</p>
            <p className="text-xs text-ink/50">2 хв тому</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-ink/60">Погодні умови</p>
            <p className="mt-2 text-sm font-semibold">+6°C • Вітер 4 м/с</p>
            <p className="text-xs text-ink/50">Вінниця</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-ink/60">Склад</p>
            <p className="mt-2 text-sm font-semibold">Дизель • запас норм</p>
            <p className="text-xs text-ink/50">оновлено сьогодні</p>
          </GlassCard>
        </aside>

        <GlassPanel className="flex w-full flex-col justify-between gap-10 rounded-[32px] p-8 lg:p-12">
          <div className="flex items-center gap-4">
            <AgroPlusLogo className="h-12 w-12" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-ink/70">
                АГРОПЛЮС
              </p>
              <p className="text-xs text-ink/50">Внутрішній портал</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold">Вітаємо!</h1>
            <p className="mt-2 text-sm text-ink/70">Увійдіть до системи</p>

            <GlassCard className="mt-6 p-6">
              <LoginForm />
            </GlassCard>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink/50">
            <span>© АГРОПЛЮС • Тільки для внутрішнього використання</span>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
