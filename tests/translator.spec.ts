import { test, expect, Page } from '@playwright/test';

async function typeAndCheck(page: Page, inputText: string, expectedSinhalaRegex: RegExp) {
  await page.goto('https://www.swifttranslator.com/', { waitUntil: 'domcontentloaded' });

  const singlishInput = page.locator('textarea').first();
  await singlishInput.fill(inputText);

  await expect(page.locator('body')).toContainText(expectedSinhalaRegex, { timeout: 15000 });
}

test.describe('Swift Translator Tests', () => {
  test('Pos_UI_0001 - Output updates automatically', async ({ page }) => {
    await typeAndCheck(page, 'mama gedhara yanavaa', /මම|මන්/);
  });

  test('Pos_Fun_0005 - Compound sentence with negation', async ({ page }) => {
    await typeAndCheck(
      page,
      'mama gedhara yanavaa, haebaeyi vahina nisaa dhaenma yannee naee.',
      /මම|ගෙදර|වැහි|නෑ|යන්න/
    );
  });
});