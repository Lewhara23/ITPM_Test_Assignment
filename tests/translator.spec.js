const { test, expect } = require('@playwright/test');

test('page loads', async ({ page }) => {
  await page.goto('https://translate.google.com');
  await expect(page).toHaveTitle(/Google/);
});