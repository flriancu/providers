import { expect, test } from '@playwright/test';
import { chooseLanguage, chooseTheme } from './settings';

test('the page says what it is and that the demo keeps nothing, in the chosen language', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Providers directory' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveText(
    'A private directory of product and service providers: their contact details, labels to find them, and notes on every conversation. ' +
      'Demo: nothing you add here is saved. Sign in with Google to keep your directory in your own Google Drive.',
  );
  await chooseLanguage(page, 'ro');
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
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByRole('link', { name: 'hello@example.com' })).toBeVisible();
  await expect(detail.getByText('Called to ask about dates and prices.')).toBeVisible();
});

test('the theme is light, dark, or the same as this device, and stays chosen (D-36)', async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  const light = await background();

  await chooseTheme(page, 'dark');
  const dark = await background();
  expect(dark).not.toBe(light);
  await page.reload();
  expect(await background()).toBe(dark); // kept on this device, applied before the first paint

  // "Same as this device" follows the device's setting, which the browser reports as an event.
  await chooseTheme(page, 'device');
  expect(await background()).toBe(light);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(background).toBe(dark);
  await chooseTheme(page, 'light');
  expect(await background()).toBe(light);
});

test('an error in an action says so and can be dismissed; the page keeps working', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() =>
    setTimeout(() => {
      throw new Error('test: a failing click');
    }),
  );
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('That did not work because of an error in the app.');
  await alert.getByRole('button', { name: 'Dismiss' }).click();
  await expect(alert).toBeHidden();
  await expect(page.getByRole('link', { name: /Sample Photo Studio/ })).toBeVisible();
});

test('when the app cannot load, the page says so and offers a reload instead of staying blank', async ({ page }) => {
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('./');
  await expect(page.getByText('The app could not load. Check the internet connection, then reload the page.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload the page' })).toBeVisible();
});

test('when the app arrives but does not run, the page says so instead of staying on its opening line', async ({ page }) => {
  await page.route('**/assets/index-*.js', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export const x = ;' }));
  await page.goto('./');
  await expect(page.getByText('The app could not load. Check the internet connection, then reload the page.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload the page' })).toBeVisible();
});

test('a browser older than the app supports is told which versions work (NFR-11)', async ({ page }) => {
  // A browser before Object.hasOwn (Chrome 93, Firefox 92, Safari 15.4).
  await page.addInitScript(() => {
    delete (Object as { hasOwn?: unknown }).hasOwn;
  });
  await page.goto('./');
  await expect(page.getByRole('alert').filter({ hasText: 'older than the app' })).toHaveText(
    'This browser is older than the app can use. Use Chrome or Edge 111, Firefox 121, Safari 16.4, or newer.',
  );
});

test('a current browser is not told it is too old (NFR-11)', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('link', { name: /Sample Photo Studio/ })).toBeVisible();
  await expect(page.getByText('older than the app')).toHaveCount(0);
});

test('the demo sample is in the language the page opens in', async ({ page }) => {
  await page.goto('./');
  await chooseLanguage(page, 'ro');
  await page.reload();
  await page.getByRole('link', { name: /Studio Foto Exemplu/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByText('Am sunat să întreb de date libere și prețuri.')).toBeVisible();
  await expect(detail.getByText('Foto', { exact: true })).toBeVisible();
});

test('the header has no tabs; the Labels page is in the header menu, which closes on the way there', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.locator('details.account-menu > summary').click();
  await page.locator('details.account-menu .menu-panel').getByRole('link', { name: 'Manage labels' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Labels', exact: true })).toBeVisible();
  await expect(page.locator('details.account-menu')).not.toHaveAttribute('open');
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.getByRole('link', { name: /Sample Photo Studio/ })).toBeVisible();
});
