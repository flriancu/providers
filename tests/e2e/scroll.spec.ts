import { expect, test } from '@playwright/test';

/**
 * On a phone the list and a provider take turns on one page (D-29). Going to a provider and
 * back must not lose the place in the list, and a provider must open at its top.
 */
test('back to the list returns to where the list was scrolled, and a provider opens at its top', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only: on wide screens the list stays on screen');
  await page.goto('./');
  for (let i = 1; i <= 30; i++) {
    await page.getByRole('link', { name: 'Add a provider' }).click();
    await page.getByLabel('Name', { exact: true }).fill(`Provider ${String(i).padStart(2, '0')}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('link', { name: 'Back to the list' }).click();
  }

  const row = page.getByRole('link', { name: /Provider 25/ });
  await row.scrollIntoViewIfNeeded();
  const listScroll = await page.evaluate(() => window.scrollY);
  expect(listScroll).toBeGreaterThan(300);

  await row.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Provider 25' })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(row).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(listScroll);

  // The browser's own Back does the same.
  await row.click();
  await page.goBack();
  await expect(row).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(listScroll);
});

test('the Labels page opens at its top, however far down the page before was scrolled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('./#/new');
  await page.getByRole('button', { name: 'Save' }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.getByRole('link', { name: 'Labels' }).click();
  await expect(page.getByRole('region', { name: 'Category', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
