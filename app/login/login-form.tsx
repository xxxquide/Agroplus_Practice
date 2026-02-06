"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Входимо..." : "Увійти"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.formError) {
      toast.error(state.formError);
    }
  }, [state.formError]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login">Логін</Label>
        <Input
          id="login"
          name="login"
          autoComplete="username"
          placeholder="admin"
          aria-invalid={Boolean(state.fieldErrors?.login)}
        />
        {state.fieldErrors?.login && (
          <p className="text-xs text-red-600">{state.fieldErrors.login}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-12"
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/50 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            )}
            aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {state.fieldErrors?.password && (
          <p className="text-xs text-red-600">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.formError && (
        <p className="text-sm text-red-600">{state.formError}</p>
      )}

      <SubmitButton />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60">
        <Link className="transition hover:text-ink" href="/support">
          Забули пароль?
        </Link>
        <span>Доступ лише через корпоративний VPN</span>
      </div>
    </form>
  );
}
