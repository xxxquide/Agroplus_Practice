import { z } from "zod";

export const loginSchema = z.object({
  login: z
    .string()
    .min(1, "Поле обов'язкове")
    .min(3, "Мінімум 3 символи"),
  password: z
    .string()
    .min(1, "Поле обов'язкове")
    .min(6, "Мінімум 6 символів")
});

export type LoginSchema = z.infer<typeof loginSchema>;
