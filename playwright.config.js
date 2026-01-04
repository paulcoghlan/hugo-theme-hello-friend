const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  webServer: {
    command: 'docker-compose up hugo-serve',
    url: 'http://localhost:1313/gallery/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:1313',
  }
});
