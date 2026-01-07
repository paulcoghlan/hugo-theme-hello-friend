const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:1313',
  },
  webServer: {
    command: 'make preview',
    port: 1313,
    reuseExistingServer: true,
  },
});
