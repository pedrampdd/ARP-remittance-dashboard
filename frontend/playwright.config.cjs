const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  retries: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    launchOptions: {
      executablePath: '/home/pedram/.cache/puppeteer/chrome/linux-138.0.7204.94/chrome-linux64/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      command: 'node src/index.js',
      cwd: '/home/pedram/ARP_task/backend',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 90000,
    },
    {
      command: 'npm run dev',
      cwd: '/home/pedram/ARP_task/frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
