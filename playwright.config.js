const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:1313',
  },
  webServer: {
    command: 'make preview',
    url: 'http://127.0.0.1:1313',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
