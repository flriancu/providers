import { expect, test, type Page } from '@playwright/test';
import { PATH_SEPARATOR } from '../../src/ui/labelText';

/** Adds a label on the Labels page; `under` puts it below a top-level category. */
async function addLabel(page: Page, facet: string, en: string, under?: string) {
  await page.getByRole('link', { name: 'Labels' }).click();
  const section = page.getByRole('region', { name: facet, exact: true });
  // The form stays open after adding, for adding several: open it only when it is closed.
  const form = section.locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  await form.getByLabel('Name', { exact: true }).fill(en);
  if (under) await form.getByLabel('Under').selectOption({ label: under });
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(section.locator('.label-row strong').getByText(en, { exact: true })).toBeVisible();
}

async function addProvider(page: Page, name: string, labels: string[] = []) {
  await page.getByRole('link', { name: 'Providers' }).click();
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  for (const l of labels) await page.locator('form.provider-form').getByRole('checkbox', { name: l, exact: true }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Language').selectOption('en');
});

test('adds a provider with contact details and labels, then edits it (FR-01, FR-05)', async ({ page, isMobile }) => {
  // Names the demo's sample does not use, so each label is really added here.
  await addLabel(page, 'Category', 'Events');
  await addLabel(page, 'Category', 'Video', 'Events');
  await addLabel(page, 'Area', 'Cluj');

  await page.getByRole('link', { name: 'Providers' }).click();
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Fill in a name.');

  await page.getByLabel('Name', { exact: true }).fill('Grădina cu Sălcii');
  await page.getByLabel('Phone numbers').fill('0721 234 567\n\n+40 31 000 0000');
  await page.getByLabel('Website and social profiles').fill('gradinacusalcii.ro');
  // The provider form's labels, not the filter column's.
  const form = page.locator('form.provider-form');
  await form.getByRole('checkbox', { name: 'Video', exact: true }).check();
  await form.getByRole('checkbox', { name: 'Cluj', exact: true }).check();
  await page.getByRole('button', { name: 'Save' }).click();

  const detail = page.getByRole('article');
  await expect(detail.getByRole('heading', { name: 'Grădina cu Sălcii' })).toBeVisible();
  await expect(detail.getByRole('link', { name: '0721 234 567' })).toHaveAttribute('href', 'tel:0721234567');
  await expect(detail.getByRole('link', { name: 'gradinacusalcii.ro' })).toHaveAttribute('href', 'https://gradinacusalcii.ro');
  await expect(detail.getByText(`Events${PATH_SEPARATOR}Video`)).toBeVisible();
  // The list shows the main category and status; on a phone it is one step back.
  if (isMobile) await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.getByRole('link', { name: new RegExp(`Grădina cu Sălcii.*Events${PATH_SEPARATOR}Video`) })).toBeVisible();
  if (isMobile) await page.getByRole('link', { name: /Grădina cu Sălcii/ }).click();

  await detail.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Contact person').fill('Ana Popescu');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('article').getByText('Ana Popescu')).toBeVisible();
});

test('keeps an interaction log, newest first, with full dates (FR-02)', async ({ page }) => {
  // A fixed day, so the calendar shows the same month whenever the test runs.
  await page.clock.setFixedTime(new Date('2026-11-20T10:00:00'));
  await page.reload();
  await page.getByLabel('Language').selectOption('en');
  await addProvider(page, 'Flashbox');
  const log = page.getByRole('region', { name: 'Conversations and notes' });
  const date = log.getByRole('button', { name: /^Date / });
  // The day is written out in full, never as the system's short format.
  await expect(date).toHaveText(/Friday,? 20 November 2026/);

  await date.click();
  await log.getByRole('dialog', { name: 'Choose a day' }).locator('[data-day="2026-11-18"] button').click();
  await expect(log.getByRole('dialog')).toBeHidden();
  await expect(date).toHaveText(/Wednesday,? 18 November 2026/);
  await expect(date).toBeFocused();
  await log.getByLabel('What happened').fill('First call');
  await log.getByRole('button', { name: 'Add to the log' }).click();

  await date.click();
  await log.getByRole('dialog', { name: 'Choose a day' }).locator('[data-day="2026-11-20"] button').click();
  await log.getByLabel('What happened').fill('Quote 900 EUR');
  await log.getByRole('button', { name: 'Add to the log' }).click();
  await expect(log.getByRole('listitem')).toHaveText([
    /Friday,? 20 November 2026\s*Quote 900 EUR/,
    /Wednesday,? 18 November 2026\s*First call/,
  ]);
  await log.getByRole('button', { name: 'Add to the log' }).click();
  await expect(log.getByRole('alert')).toHaveText('Write what happened.');
});

test('closes the calendar with Escape, keeping the day', async ({ page }) => {
  await addProvider(page, 'Bedda Band');
  const log = page.getByRole('region', { name: 'Conversations and notes' });
  const date = log.getByRole('button', { name: /^Date / });
  const before = await date.textContent();
  await date.click();
  await expect(log.getByRole('dialog', { name: 'Choose a day' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(log.getByRole('dialog')).toBeHidden();
  await expect(date).toHaveText(before!);
  await expect(date).toBeFocused();
});

test('deletes a provider after asking', async ({ page }) => {
  await addProvider(page, 'Lagoo');
  await page.getByRole('button', { name: 'Delete provider' }).click();
  await expect(page.getByText('Delete Lagoo and their log? This cannot be undone.')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('link', { name: /Lagoo/ })).toBeHidden();
  await expect(page.getByRole('link', { name: /Sample Photo Studio/ })).toBeVisible();
});

test('on a wide screen, the list stays beside the chosen provider (D-29)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wide screens only');
  await addProvider(page, 'Bruno Photography');
  await expect(page.getByRole('region', { name: 'Providers' })).toBeVisible();
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the list' })).toBeHidden();
});

test('on a phone, the list and a provider take turns, and Back returns to the list (D-29)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await addProvider(page, 'Bruno Photography');
  await expect(page.getByRole('region', { name: 'Providers' })).toBeHidden();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.getByRole('region', { name: 'Providers' })).toBeVisible();
  await page.getByRole('link', { name: /Bruno Photography/ }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Providers' })).toBeVisible();
});
