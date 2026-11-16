import { expect, test } from '@playwright/test';

test('the page says what it is and that the demo keeps nothing, in the chosen language', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Providers directory' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveText('Demo: nothing you add here is saved.');
  await page.getByLabel('Language').selectOption('ro');
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog de furnizori' })).toBeVisible();
  await expect(page).toHaveTitle('Catalog de furnizori');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog de furnizori' })).toBeVisible();
});

test('the page fits a narrow phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ['./', './#/new', './#/labels']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('the demo starts with one made-up provider, to show what a record looks like', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Language').selectOption('en');
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByRole('link', { name: 'hello@example.com' })).toBeVisible();
  await expect(detail.getByText('Called to ask about dates and prices.')).toBeVisible();
});
