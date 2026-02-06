import { test, expect } from "@playwright/test";

const routes = [
  { path: "/dashboard", heading: "Оперативна панель" },
  { path: "/fields", heading: "Інтерактивна карта" },
  { path: "/warehouse", heading: "Складський облік" },
  { path: "/reports", heading: "Звіти та документи" },
  { path: "/users", heading: "Працівники та доступ" },
  { path: "/settings", heading: "Панель налаштувань" },
  { path: "/support", heading: "Центр підтримки" },
  { path: "/profile", heading: "Особистий профіль" }
];

const login = async (page: any) => {
  const loginValue = process.env.E2E_LOGIN;
  const passwordValue = process.env.E2E_PASSWORD;
  if (!loginValue || !passwordValue) {
    test.skip(true, "E2E_LOGIN/E2E_PASSWORD not set");
  }
  await page.goto("/login");
  await page.getByLabel("Логін").fill(loginValue);
  await page.getByLabel("Пароль").fill(passwordValue);
  await page.getByRole("button", { name: "Увійти" }).click();
  await page.waitForURL("**/dashboard");
};

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Увійти" })).toBeVisible();
});

test("protected pages render headings", async ({ page }) => {
  await login(page);
  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  }
});
