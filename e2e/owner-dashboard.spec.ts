import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.CANCHEA_TEST_OWNER_EMAIL ?? "pruebas.propietario@canchea.bo";
const ownerPassword = process.env.CANCHEA_TEST_OWNER_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/auth/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(ownerEmail);
  await page.getByLabel("Contraseña").fill(ownerPassword!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/propietario\/dashboard/, { timeout: 20_000 });
}

test.describe("panel sencillo del propietario", () => {
  test("@authenticated prioriza calendario, reservas y KPIs", async ({ page }, testInfo) => {
    test.skip(!ownerPassword, "Define CANCHEA_TEST_OWNER_PASSWORD para comprobar al propietario.");
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 500) browserErrors.push(`${response.status()} ${response.url()}`);
    });

    await signIn(page);

    await expect(page.getByRole("region", { name: "Indicadores principales" })).toContainText("Reservas de hoy");
    await expect(page.getByRole("region", { name: "Indicadores principales" })).toContainText("Ocupación del mes");
    await expect(page.getByRole("heading", { name: "Próximos 7 días" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reservas de hoy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Canchas registradas" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Cuenta" }).getByRole("link", { name: "Inicio" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Cuenta" }).getByRole("link", { name: "Configuración" })).toBeVisible();

    await page.screenshot({ fullPage: true, path: testInfo.outputPath("owner-dashboard.png") });
    expect(browserErrors).toEqual([]);
  });
});
