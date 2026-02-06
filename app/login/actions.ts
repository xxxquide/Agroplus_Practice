"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export type LoginState = {
  fieldErrors?: {
    login?: string;
    password?: string;
  };
  formError?: string;
};

const defaultError = "Невірний логін або пароль";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    login: String(formData.get("login") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        login: fieldErrors.login?.[0],
        password: fieldErrors.password?.[0]
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { login: parsed.data.login }
  });

  if (!user) {
    return { formError: defaultError };
  }

  if (!user.isActive) {
    return { formError: "Доступ заблоковано. Зверніться до адміністратора." };
  }

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { formError: defaultError };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastActiveAt: new Date() }
  });

  const token = createSessionToken({ uid: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  redirect("/dashboard");
}
