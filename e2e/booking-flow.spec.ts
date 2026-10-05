import { expect, test, type Page } from "@playwright/test";

const playerEmail = process.env.CANCHEA_TEST_PLAYER_EMAIL ?? "pruebas.jugador@canchea.bo";
const playerPassword = process.env.CANCHEA_TEST_PLAYER_PASSWORD;
const ownerEmail = process.env.CANCHEA_TEST_OWNER_EMAIL ?? "pruebas.propietario@canchea.bo";
const ownerPassword = process.env.CANCHEA_TEST_OWNER_PASSWORD;
const adminEmail = process.env.CANCHEA_TEST_ADMIN_EMAIL;
const adminPassword = process.env.CANCHEA_TEST_ADMIN_PASSWORD;

function boliviaDate(daysFromToday: number) {
  const date = new Date(Date.now() + daysFromToday * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/auth\/iniciar-sesion/, { timeout: 20_000 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/auth\/iniciar-sesion/);
}

test.describe("recorrido público de reserva", () => {
  test("busca, abre una cancha y conserva la selección al pedir acceso", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const location = message.location().url;
      browserErrors.push(location ? `${message.text()} (${location})` : message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 500) browserErrors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const search = page.getByRole("form", { name: "Buscar una cancha" });
    await search.locator('select[name="deporte"]').selectOption("futbol");
    await search.locator('select[name="zona"]').selectOption("");
    await search.getByLabel("Fecha de la reserva").fill(boliviaDate(1));
    await search.getByLabel("Hora de la reserva").fill("");
    await search.getByRole("button", { name: "Buscar cancha" }).click();

    await expect(page).toHaveURL(/\/buscar\?/);
    const firstResult = page.locator(".search-result-card").first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    await firstResult.getByRole("link", { name: "Ver cancha" }).click();

    await expect(page.locator("main h1")).toBeVisible();
    const reserveSelectedSlot = page.getByRole("link", { name: "Reservar este horario" }).first();
    await expect(reserveSelectedSlot).toBeVisible({ timeout: 20_000 });
    await reserveSelectedSlot.click();

    await expect(page).toHaveURL(/\/auth\/iniciar-sesion\?continuar=/);
    await expect(page.getByRole("heading", { name: "Vuelve a la cancha." })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/iniciar-sesion/);
    expect(browserErrors).toEqual([]);
  });
});

test.describe.serial("@authenticated reserva con pago Mock y trazabilidad por rol", () => {
  let bookingCode = "";

  test.skip(({ isMobile }) => Boolean(isMobile), "El flujo que crea datos se ejecuta una sola vez.");
  test.skip(!playerPassword, "Define CANCHEA_TEST_PLAYER_PASSWORD para ejecutar el pago Mock.");

  test("el jugador confirma una reserva y la ve en su historial", async ({ page }) => {
    await signIn(page, playerEmail, playerPassword!);
    await page.goto(`/buscar?deporte=futbol&zona=&fecha=${boliviaDate(1)}&hora=`);

    const firstResult = page.locator(".search-result-card").first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    await firstResult.getByRole("link", { name: /^Reservar/ }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu reserva" })).toBeVisible();
    await page.getByRole("button", { name: "Bloquear por 5 minutos" }).click();

    await expect(page).toHaveURL(/\/reservar\/[0-9a-f-]{36}$/i, { timeout: 20_000 });
    const reservationHeading = page.locator(".private-heading h1");
    bookingCode = (await reservationHeading.textContent())?.replace(/^Reserva\s+/, "").trim() ?? "";
    expect(bookingCode).not.toBe("");

    await page.getByRole("button", { name: "Generar pago de prueba" }).click();
    await expect(page.getByRole("button", { name: "Simular pago aprobado" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Simular pago aprobado" }).click();
    await expect(page.getByText("Pago de prueba confirmado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Reserva asegurada")).toBeVisible();

    await page.goto("/jugador/reservas");
    await expect(page.getByText(bookingCode, { exact: true }).first()).toBeVisible();
    await signOut(page);
  });

  test("el propietario ve la reserva confirmada", async ({ page }) => {
    test.skip(!ownerPassword, "Define CANCHEA_TEST_OWNER_PASSWORD para comprobar al propietario.");
    test.skip(!bookingCode, "La reserva del jugador no llegó a crearse.");
    await signIn(page, ownerEmail, ownerPassword!);
    await page.goto("/propietario/reservas");
    await expect(page.getByText(bookingCode, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
    await signOut(page);
  });

  test("el super admin ve la reserva en operaciones", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Define las credenciales E2E del administrador para comprobar operaciones.");
    test.skip(!bookingCode, "La reserva del jugador no llegó a crearse.");
    await signIn(page, adminEmail!, adminPassword!);
    await page.goto("/admin/operaciones");
    await expect(page.getByRole("region", { name: "Últimas reservas" }).getByText(bookingCode, { exact: true })).toBeVisible({ timeout: 20_000 });
    await signOut(page);
  });
});
