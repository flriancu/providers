import { expect, test, type Page } from '@playwright/test';
import { openLabels, toList } from './settings';

/**
 * Browse (FR-10..13): with the demo's Sample Photo Studio (Photo, Bucharest), plus
 * Lagoo (Cluj, no category) and Flashbox (Photo, Cluj).
 */
async function addLabel(page: Page, facet: string, name: string) {
  await openLabels(page);
  const form = page.getByRole('region', { name: facet, exact: true }).locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  await form.getByLabel('Name', { exact: true }).fill(name);
  await form.getByRole('button', { name: 'Add the label', exact: true }).click();
}

async function addProvider(page: Page, name: string, labels: string[]) {
  await toList(page);
  await page.getByRole('link', { name: 'Add a provider' }).click();
  const form = page.locator('form.provider-form');
  await form.getByLabel('Name', { exact: true }).fill(name);
  for (const l of labels) await form.getByRole('checkbox', { name: l, exact: true }).check();
  await form.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

async function setUp(page: Page) {
  await page.goto('./');
  await addLabel(page, 'Area', 'Cluj');
  await addProvider(page, 'Lagoo', ['Cluj']);
  await addProvider(page, 'Flashbox', ['Photo', 'Cluj']);
  await toList(page);
}

const names = (page: Page) => page.locator('.provider-list .provider-name');

test.describe('wide screens: filters in their own column', () => {
  test.skip(({ isMobile }) => isMobile, 'wide screens');

  test('finds category x in area y, with counts, chips and the address keeping it (FR-10..12)', async ({ page }) => {
    await setUp(page);
    const filters = page.getByRole('complementary', { name: 'Filters' });
    await expect(names(page)).toHaveText(['Flashbox', 'Lagoo', 'Sample Photo Studio']);

    // Counts before ticking: Photo has 2 providers, Bucharest 1.
    await expect(filters.getByRole('checkbox', { name: 'Photo, 2 providers' })).toBeVisible();
    await filters.getByRole('checkbox', { name: /^Photo,/ }).check();
    await expect(names(page)).toHaveText(['Flashbox', 'Sample Photo Studio']);
    // Within Photo, Bucharest now has 1 and Cluj 1; ticking Bucharest leaves the sample.
    await filters.getByRole('checkbox', { name: 'Bucharest, 1 provider' }).check();
    await expect(names(page)).toHaveText(['Sample Photo Studio']);
    await expect(page.getByRole('heading', { name: /Providers\s*1 of 3 providers/ })).toBeVisible();

    // Opening a provider keeps the query in the list beside it.
    await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
    await expect(page.getByRole('article')).toBeVisible();
    await expect(names(page)).toHaveText(['Sample Photo Studio']);

    // The labels are a link away, under the filters; back from there, the filters are kept.
    await filters.getByRole('link', { name: 'Manage labels' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Labels', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(names(page)).toHaveText(['Sample Photo Studio']);

    // Each chosen value is a removable chip; Clear all removes every one.
    await page.getByRole('button', { name: 'Remove filter Bucharest' }).click();
    await expect(names(page)).toHaveText(['Flashbox', 'Sample Photo Studio']);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(names(page)).toHaveText(['Flashbox', 'Lagoo', 'Sample Photo Studio']);

    // The address keeps the query through a reload (the demo itself starts over: only the sample remains).
    await filters.getByRole('checkbox', { name: /^Bucharest,/ }).check();
    // The address follows within 125 ms (route.ts): wait for it to hold just this filter.
    await expect.poll(() => decodeURIComponent(page.url())).toMatch(/[?&]f=facet-area~[^&]+$/);
    await page.reload();
    await expect(names(page)).toHaveText(['Sample Photo Studio']);
    await expect(page.getByRole('button', { name: 'Remove filter Bucharest' })).toBeVisible();
  });

  test('offers "No category" for providers without one, and greys out values that would empty the list (D-33, FR-11)', async ({ page }) => {
    await setUp(page);
    const filters = page.getByRole('complementary', { name: 'Filters' });
    await filters.getByRole('checkbox', { name: 'No category, 1 provider' }).check();
    await expect(names(page)).toHaveText(['Lagoo']);
    // Lagoo is not in Bucharest: that value would empty the list, so it cannot be ticked.
    await expect(filters.getByRole('checkbox', { name: 'Bucharest, 0 providers' })).toBeDisabled();
  });

  test('with a search, each count is of what the search found (FR-11)', async ({ page }) => {
    await setUp(page);
    const filters = page.getByRole('complementary', { name: 'Filters' });
    await page.getByRole('searchbox', { name: 'Search providers' }).fill('lagoo');
    await expect(names(page)).toHaveText(['Lagoo']);
    // Photo has 2 providers, but neither is Lagoo: ticking it would empty the list.
    await expect(filters.getByRole('checkbox', { name: 'Photo, 0 providers' })).toBeVisible();
    await expect(filters.getByRole('checkbox', { name: 'Cluj, 1 provider' })).toBeVisible();
  });

  test('searches within the filters, tolerating typos (FR-13)', async ({ page }) => {
    await setUp(page);
    const search = page.getByRole('searchbox', { name: 'Search providers' });
    await search.fill('sampel');
    await expect(names(page)).toHaveText(['Sample Photo Studio']);
    await search.fill('photo');
    await expect(names(page)).toHaveText(['Sample Photo Studio', 'Flashbox']); // name first, then label
    await page
      .getByRole('complementary', { name: 'Filters' })
      .getByRole('checkbox', { name: /^Cluj,/ })
      .check();
    await expect(names(page)).toHaveText(['Flashbox']);
    await expect(page.getByRole('heading', { name: /1 of 3 providers/ })).toBeVisible();
  });
});

test.describe('phones: filters open over the page (D-34)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones');

  test('each tick changes the list at once; the button says how many and closes the panel', async ({ page }) => {
    await setUp(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('checkbox', { name: /^Cluj,/ }).check();
    await expect(sheet.getByRole('button', { name: 'Show 2 providers' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Show 2 providers' }).click();
    await expect(sheet).toBeHidden();
    await expect(names(page)).toHaveText(['Flashbox', 'Lagoo']);
    await expect(page.getByRole('button', { name: 'Filters (1 chosen)' })).toBeFocused();

    // Ticks apply even when the panel is closed with Escape.
    await page.getByRole('button', { name: 'Filters (1 chosen)' }).click();
    await sheet.getByRole('checkbox', { name: /^Photo,/ }).check();
    await page.keyboard.press('Escape');
    await expect(names(page)).toHaveText(['Flashbox']);
  });

  test('the labels are a link away, at the end of the filters; back from there, the filters are kept', async ({ page }) => {
    await setUp(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('checkbox', { name: /^Cluj,/ }).check();
    await sheet.getByRole('link', { name: 'Manage labels' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('heading', { level: 2, name: 'Labels', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(names(page)).toHaveText(['Flashbox', 'Lagoo']);
  });

  test('Back with the panel open leaves the panel behind; the page behind works', async ({ page }) => {
    await setUp(page); // ends on the list, after opening Flashbox
    await page.getByRole('link', { name: /Lagoo/ }).click();
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden();
    await page.getByRole('article').getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Lagoo');
  });

  test('while the panel is open, Tab never reaches the page behind it', async ({ page }) => {
    await setUp(page);
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await expect(sheet).toBeVisible();
    const outside = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active !== document.body && !document.querySelector('dialog.sheet')!.contains(active);
      });
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      expect(await outside()).toBe(false);
    }
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      expect(await outside()).toBe(false);
    }
  });
});

test('on a tablet, a drag that starts inside the filters panel and ends beside it leaves it open', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await setUp(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  const box = (await sheet.locator('.sheet-header').boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(100, 500, { steps: 5 });
  await page.mouse.up();
  await expect(sheet).toBeVisible();
});

test('on a tablet, the filters panel closes with a tap beside it, and focus returns to the Filters button', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await setUp(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  await expect(sheet).toBeVisible();
  await page.mouse.click(100, 500); // the dimmed page beside the panel
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeFocused();
});
