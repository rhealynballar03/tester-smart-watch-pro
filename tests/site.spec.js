// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Smart Watch Pro landing page", () => {
  test.beforeEach(async ({ page }) => {
    // Block the looping hero video — its constant repaints make WebKit flake
    // on element stability. Not needed for these tests.
    await page.route(/\.mp4(\?|$)/, (route) => route.abort());
  });

  test("homepage loads with hero and contact form", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Smart Watch Pro/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The contact form and its fields are present.
    await expect(page.locator(".contact-form")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
  });

  test("contact form accepts input (no submit, so no data is saved)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill("ada@example.com");
    await page.getByLabel("Message").fill("Testing the form with Playwright.");
    await page.getByRole("checkbox").check();

    await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("Email")).toHaveValue("ada@example.com");
    await expect(page.getByRole("checkbox")).toBeChecked();
  });

  test("hero CTA navigates to the Sights page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.locator('a[href="Sights.html"]').first().click();
    await expect(page).toHaveURL(/Sights\.html$/);
  });

  test("thank-you page redirects to the product page", async ({ page }) => {
    // Visiting the thank-you page directly should bounce to product.html.
    await page.goto("/thankyou.html");
    await expect(page).toHaveURL(/product\.html$/, { timeout: 10000 });
  });
});
