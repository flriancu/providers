import { expect, test, type Page } from '@playwright/test';

/** Adds a label on the Labels page. */
async function addLabel(page: Page, facet: string, en: string) {
  await page.getByRole('link', { name: 'Labels' }).click();
  const section = page.getByRole('region', { name: facet, exact: true });
  // The form stays open after adding, for adding several: open it only when it is closed.
  const form = section.locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  await form.getByLabel('Name', { exact: true }).fill(en);
  await form.getByRole('button', { name: 'Add the label', exact: true }).click();
  await expect(section.locator('.label-row strong').getByText(en, { exact: true })).toBeVisible();
}

async function addProvider(page: Page, name: string, labels: string[] = []) {
  await page.getByRole('link', { name: 'Providers' }).click();
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  for (const l of labels) await page.locator('form.provider-form').getByRole('checkbox', { name: l, exact: true }).check();
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('adds a provider with contact details and labels, then edits it (FR-01, FR-05)', async ({ page, isMobile }) => {
  // Names the demo's sample does not use, so each label is really added here.
  await addLabel(page, 'Category', 'Video');
  await addLabel(page, 'Area', 'Cluj');

  await page.getByRole('link', { name: 'Providers' }).click();
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('alert')).toHaveText('Fill in a name.');

  await page.getByLabel('Name', { exact: true }).fill('Grădina cu Sălcii');
  // One field per phone: the second comes from "+ Add a phone number"; an empty one is dropped.
  const field = (name: string) => page.getByRole('textbox', { name, exact: true });
  await field('Phone number').fill('0721 234 567');
  await page.getByRole('button', { name: '+ Add a phone number' }).click();
  await expect(field('Phone number 2')).toBeFocused();
  await field('Phone number 2').fill('+40 31 000 0000');
  await page.getByRole('button', { name: '+ Add a phone number' }).click();
  await page.getByRole('button', { name: '+ Add a phone number' }).click();
  await page.getByRole('button', { name: 'Remove phone number 4' }).click();
  await expect(page.getByRole('textbox', { name: /^Phone number \d$/ })).toHaveCount(3);
  await field('Website or social profile').fill('gradinacusalcii.ro');
  // The provider form's labels, not the filter column's.
  const form = page.locator('form.provider-form');
  await form.getByRole('checkbox', { name: 'Video', exact: true }).check();
  await form.getByRole('checkbox', { name: 'Cluj', exact: true }).check();
  await page.getByRole('button', { name: 'Save the provider' }).click();

  const detail = page.getByRole('article');
  await expect(detail.getByRole('heading', { name: 'Grădina cu Sălcii' })).toBeVisible();
  await expect(detail.getByRole('link', { name: '0721 234 567' })).toHaveAttribute('href', 'tel:0721234567');
  await expect(detail.getByRole('link', { name: 'gradinacusalcii.ro' })).toHaveAttribute('href', 'https://gradinacusalcii.ro');
  await expect(detail.getByText('Video', { exact: true })).toBeVisible();
  // The list shows the main category and status; on a phone it is one step back.
  if (isMobile) await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.getByRole('link', { name: /Grădina cu Sălcii.*Video/ })).toBeVisible();
  if (isMobile) await page.getByRole('link', { name: /Grădina cu Sălcii/ }).click();

  await detail.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Contact person').fill('Ana Popescu');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('article').getByText('Ana Popescu')).toBeVisible();
});

test('finds a label in the form by typing, and creates a new one only when chosen (FR-07)', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  const form = page.locator('form.provider-form');
  await form.getByLabel('Name', { exact: true }).fill('Lagoo');
  const area = form.getByRole('group', { name: 'Area' });
  await area.getByRole('button', { name: '+ Add a label' }).click();
  const find = area.getByRole('combobox', { name: /Find or add a label/ });
  await expect(find).toBeFocused();

  // An existing label, found by the start of its name in any case, ticked with Enter.
  await find.fill('BUCH');
  await expect(area.getByRole('option', { name: 'Bucharest' })).toBeVisible();
  await find.press('ArrowDown');
  await find.press('Enter');
  await expect(area.getByRole('checkbox', { name: 'Bucharest' })).toBeChecked();
  await expect(find).toHaveValue('');

  // A name no label has: typing alone creates nothing; choosing the offer does.
  await find.fill('Cluj');
  const offer = area.getByRole('option', { name: 'Create the label “Cluj”' });
  await expect(offer).toBeVisible();
  await expect(area.getByRole('checkbox', { name: 'Cluj' })).toHaveCount(0);
  await offer.click();
  await expect(area.getByRole('checkbox', { name: 'Cluj' })).toBeChecked();

  // A group with no labels shows only the way to add one.
  await expect(form.getByRole('group', { name: 'Lists' }).getByRole('button', { name: '+ Add a label' })).toBeVisible();
  await form.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('article').getByText('Cluj', { exact: true })).toBeVisible();
});

test('keeps an interaction log, newest first, with full dates (FR-02)', async ({ page }) => {
  // A fixed day, so the calendar shows the same month whenever the test runs.
  await page.clock.setFixedTime(new Date('2026-11-20T10:00:00'));
  await page.reload();
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

test('the calendar has Choose today and Cancel, and closes when focus leaves it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T10:00:00'));
  await page.reload();
  await addProvider(page, 'Bedda Band');
  const log = page.getByRole('region', { name: 'Conversations and notes' });
  const date = log.getByRole('button', { name: /^Date / });
  const calendar = log.getByRole('dialog', { name: 'Choose a day' });

  await date.click();
  await calendar.locator('[data-day="2026-11-18"] button').click();
  await date.click();
  await calendar.getByRole('button', { name: 'Choose today' }).click();
  await expect(calendar).toBeHidden();
  await expect(date).toHaveText(/Friday,? 20 November 2026/);

  await date.click();
  await calendar.getByRole('button', { name: 'Cancel' }).click();
  await expect(calendar).toBeHidden();
  await expect(date).toBeFocused();

  // Focus leaving the field (to the text box below) closes the calendar.
  await date.click();
  await expect(calendar).toBeVisible();
  await log.getByLabel('What happened').focus();
  await expect(calendar).toBeHidden();
});

test('what is typed in the form survives leaving it, and comes back until discarded', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.locator('form.provider-form').getByLabel('Name', { exact: true }).fill('Lagoo');
  await page.getByRole('link', { name: 'Labels' }).click();
  await page.getByRole('link', { name: 'Providers' }).click();

  await expect(page.getByText('You started a new provider and have not saved it yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Continue editing' }).click();
  const form = page.locator('form.provider-form');
  await expect(form.getByLabel('Name', { exact: true })).toHaveValue('Lagoo');
  await expect(form.getByText('Your unsaved changes from before are back.')).toBeVisible();
  // A reload keeps it too.
  await page.reload();
  await expect(page.locator('form.provider-form').getByLabel('Name', { exact: true })).toHaveValue('Lagoo');
  await page.getByRole('button', { name: 'Discard them' }).click();
  await expect(page.locator('form.provider-form').getByLabel('Name', { exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Labels' }).click();
  await page.getByRole('link', { name: 'Providers' }).click();
  await expect(page.getByText('You started a new provider and have not saved it yet.')).toBeHidden();
});

test('edits left unsaved on a provider are flagged on its page, and Save clears them', async ({ page }) => {
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  await page.getByRole('article').getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Contact person').fill('Someone else');
  await page.getByRole('link', { name: 'Labels' }).click();
  await page.getByRole('link', { name: 'Providers' }).click();
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const article = page.getByRole('article');
  await expect(article.getByText('This provider has changes that are not saved yet.')).toBeVisible();
  await article.getByRole('link', { name: 'Continue editing' }).click();
  await expect(page.getByLabel('Contact person')).toHaveValue('Someone else');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('article').getByText('Someone else')).toBeVisible();
  await expect(page.getByText('This provider has changes that are not saved yet.')).toBeHidden();
});

test('opening a provider moves focus to its name; back on the list, to its row', async ({ page, isMobile }) => {
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Sample Photo Studio' })).toBeFocused();
  await page.getByRole('article').getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Edit Sample Photo Studio' })).toBeFocused();
  await page.getByRole('link', { name: 'Cancel' }).click();
  if (isMobile) {
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(page.getByRole('link', { name: /Sample Photo Studio/ })).toBeFocused();
  }
});

test('a deleted log entry comes back with Undo', async ({ page }) => {
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const log = page.getByRole('region', { name: 'Conversations and notes' });
  await expect(log.getByText('Called to ask about dates and prices.')).toBeVisible();
  await log.getByRole('button', { name: 'Delete this entry' }).click();
  await expect(log.getByText('Called to ask about dates and prices.')).toBeHidden();
  await expect(log.getByText('The entry was deleted.')).toBeVisible();
  await log.getByRole('button', { name: 'Undo' }).click();
  await expect(log.getByText('Called to ask about dates and prices.')).toBeVisible();
  await expect(log.getByRole('button', { name: 'Undo' })).toBeHidden();
});

test('deletes a provider after asking', async ({ page }) => {
  await addProvider(page, 'Lagoo');
  await page.getByRole('button', { name: 'Delete provider' }).click();
  await expect(page.getByText('Delete Lagoo and their log? This cannot be undone.')).toBeVisible();
  await page.getByRole('button', { name: 'Delete Lagoo', exact: true }).click();
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

test('each row offers a call and its website, named in full, opening the site apart from the app', async ({ page }) => {
  const row = page.locator('.provider-list li').filter({ hasText: 'Sample Photo Studio' });
  const call = row.getByRole('link', { name: 'Call +40 000 000 000' });
  await expect(call).toHaveAttribute('href', 'tel:+40000000000');
  const site = row.getByRole('link', { name: 'Open the website https://www.example.com' });
  await expect(site).toHaveAttribute('href', 'https://www.example.com');
  await expect(site).toHaveAttribute('target', '_blank');
  // No Instagram or TikTok on this provider: no buttons for them.
  await expect(row.getByRole('link', { name: /Instagram|TikTok/ })).toHaveCount(0);
});
