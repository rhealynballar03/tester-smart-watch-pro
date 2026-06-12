// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * Contact form end-to-end test.
 *
 * IMPORTANT — how the mocking works:
 * The form POSTs to the server's /submit route, and it is the SERVER that
 * writes to Google Sheets + Supabase and sends email. The browser never calls
 * those services directly, so to keep this test safe and offline we intercept
 * the /submit request in the browser and return the exact redirect the server
 * would (302 -> /thankyou.html). That means NO real Google Sheets / Supabase /
 * Resend calls happen when this test runs.
 */
test.describe("Contact form", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend: intercept the form submission so the real server logic
    // (and its external Google Sheets / Supabase / email writes) is never run.
    // We return a 200 HTML page that redirects to the thank-you page — the same
    // end result as the server's 302. (We can't fulfill with a 3xx status
    // directly, because WebKit/Safari rejects that.)
    await page.route("**/submit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body:
          '<!doctype html><meta http-equiv="refresh" content="0;url=/thankyou.html">' +
          '<script>location.replace("/thankyou.html")</script>',
      });
    });

    // Extra safety: if anything ever tried to reach Supabase or the Google
    // Sheets API straight from the browser, block it outright.
    await page.route(/supabase\.co/, (route) => route.abort());
    await page.route(/sheets\.googleapis\.com/, (route) => route.abort());

    // Block the looping hero video. Its constant repaints make WebKit consider
    // elements "unstable", which flakes out clicks. We don't need it for tests.
    await page.route(/\.mp4(\?|$)/, (route) => route.abort());
  });

  test("fills the form, submits, and redirects to the thank-you page", async ({ page }) => {
    // 1) Open the local project. domcontentloaded = don't wait for the heavy
    //    hero video to finish loading (not needed for this test).
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 2) Fill in the contact form fields.
    await page.getByLabel("Name").fill("Grace Hopper");
    await page.getByLabel("Email").fill("grace@example.com");
    await page.getByLabel("Message").fill("Loved the watch — tell me more!");
    await page.getByRole("checkbox").check();

    // 3) Submit the form and wait for the redirect it triggers.
    await Promise.all([
      page.waitForURL(/thankyou\.html$/),
      page.getByRole("button", { name: /submit/i }).click(),
    ]);

    // 4) Confirm we landed on the thank-you page.
    await expect(page).toHaveURL(/thankyou\.html$/);
    await expect(page.getByRole("heading", { name: /thank/i })).toBeVisible();
  });
});
