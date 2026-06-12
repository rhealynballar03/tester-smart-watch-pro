// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright config for the Tester Smart Watch Pro site.
 * Tests run against the local Express server, which Playwright starts
 * automatically (or reuses if you already have it running).
 *
 *   npm test            → run all tests, all browsers (headless)
 *   npm run test:headed → watch them run in real browser windows
 *   npm run test:ui     → interactive UI mode (step through, time-travel)
 */
module.exports = defineConfig({
  // Discover specs in the project root (e.g. test-forms.spec.js) and in tests/.
  testDir: ".",
  testIgnore: ["node_modules/**", ".vercel/**", "md_extracted/**"],
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60 * 1000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 60 * 1000,
    actionTimeout: 15 * 1000,
    // Trigger the site's prefers-reduced-motion CSS so animations are disabled
    // during tests — keeps elements "stable" and reliable across all browsers.
    reducedMotion: "reduce",
  },

  // Run every test in all three engines.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }, // Safari engine
  ],

  // Start the site automatically for tests; reuse one already running.
  webServer: {
    command: "node server.js",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
