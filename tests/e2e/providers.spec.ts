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

test('each row offers a call, an email and its website, named in full, opening the site apart from the app', async ({ page }) => {
  const row = page.locator('.provider-list li').filter({ hasText: 'Sample Photo Studio' });
  const call = row.getByRole('link', { name: 'Call +40 000 000 000' });
  await expect(call).toHaveAttribute('href', 'tel:+40000000000');
  await expect(row.getByRole('link', { name: 'Write to hello@example.com' })).toHaveAttribute('href', 'mailto:hello@example.com');
  const site = row.getByRole('link', { name: 'Open the website https://www.example.com' });
  await expect(site).toHaveAttribute('href', 'https://www.example.com');
  await expect(site).toHaveAttribute('target', '_blank');
  // No Instagram or TikTok on this provider: no buttons for them.
  await expect(row.getByRole('link', { name: /Instagram|TikTok/ })).toHaveCount(0);
});

/** Opens a provider page the way a link in the list does, also where the list is hidden (phone). */
async function openByHash(page: Page, name: string, edit = false) {
  const address = await page.locator('a.row-link').filter({ hasText: name }).getAttribute('href');
  await page.evaluate((h) => (location.hash = h), edit ? address!.replace(/(#\/p\/[^?]+)/, '$1/edit') : address!);
}

test('nothing typed or armed on one provider carries over to the next', async ({ page }) => {
  await addProvider(page, 'Lagoo');
  const log = page.getByRole('region', { name: 'Conversations and notes' });
  await log.getByLabel('What happened').fill('Meant for Lagoo');
  await page.getByRole('button', { name: 'Delete provider' }).click();
  await openByHash(page, 'Sample Photo Studio');
  await expect(page.getByRole('heading', { level: 2, name: 'Sample Photo Studio' })).toBeVisible();
  await expect(log.getByLabel('What happened')).toHaveValue('');
  await expect(page.getByRole('button', { name: /^Delete Lagoo|^Delete Sample/ })).toHaveCount(0);

  // From one edit form straight to another (Back and Forward do this): each shows its own provider.
  await openByHash(page, 'Lagoo', true);
  await page.getByLabel('Name', { exact: true }).fill('Lagoo renamed');
  await openByHash(page, 'Sample Photo Studio', true);
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Sample Photo Studio');
});

test('Save or Add pressed twice before the screen updates acts once', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Twice Saved');
  // Two clicks in one task: the second arrives before React has drawn the result of the first.
  await page.getByRole('button', { name: 'Save the provider' }).evaluate((b: HTMLElement) => (b.click(), b.click()));
  await expect(page.getByRole('heading', { level: 2, name: 'Twice Saved' })).toBeVisible();
  await expect(page.locator('.provider-list .provider-name').filter({ hasText: 'Twice Saved' })).toHaveCount(1);

  const log = page.getByRole('region', { name: 'Conversations and notes' });
  await log.getByLabel('What happened').fill('Called once');
  await log.getByRole('button', { name: 'Add to the log' }).evaluate((b: HTMLElement) => (b.click(), b.click()));
  await expect(log.locator('.log-entries li')).toHaveCount(1);
  await expect(log.getByRole('alert')).toHaveCount(0);
});

test('a stray % in a profile address shows as typed and the list keeps working', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Fifty Off');
  await page.getByRole('textbox', { name: 'Website or social profile', exact: true }).fill('https://www.instagram.com/50%off/');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Fifty Off' })).toBeVisible();
  // The demo keeps nothing across a reload: back to the list in the page.
  await page.evaluate(() => (location.hash = '#/'));
  const row = page.locator('.provider-list li').filter({ hasText: 'Fifty Off' });
  await expect(row.getByRole('link', { name: /Instagram.*50%off/ })).toBeVisible();
});

test('a hostile address opens the list instead of stopping the app', async ({ page }) => {
  for (const hash of ['#/?f=__proto__~x', '#/?f=constructor~x', '#/p/%', '#/p/%E0%A4%A/edit', '#/p/constructor']) {
    await page.goto(`./${hash}`);
    await page.reload();
    await expect(page.getByText('The page stopped working.')).toHaveCount(0);
    await expect(page.locator('.app-header')).toBeVisible();
  }
});

test('a link of another scheme shows as text, never as a link or a website button', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Odd Links');
  await page.getByRole('textbox', { name: 'Website or social profile', exact: true }).fill('javascript://%0Aalert(1)');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByText('javascript://%0Aalert(1)')).toBeVisible();
  await expect(detail.getByRole('link', { name: 'javascript://%0Aalert(1)' })).toHaveCount(0);
  await page.evaluate(() => (location.hash = '#/'));
  const row = page.locator('.provider-list li').filter({ hasText: 'Odd Links' });
  await expect(row.getByRole('link', { name: /Open the website/ })).toHaveCount(0);
});

test('a new provider that looks like one already here waits for a choice: save both, or add to it (FR-23)', async ({ page }) => {
  await page.getByRole('link', { name: 'Add a provider' }).click();
  await page.getByLabel('Name', { exact: true }).fill('sample photo studio');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  const doubt = page.getByRole('alert').filter({ hasText: 'This provider may already be in the directory.' });
  await expect(doubt).toContainText('Looks like Sample Photo Studio, already in the directory (same name).');
  await doubt.getByRole('button', { name: 'Save as a new provider' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'sample photo studio' })).toBeVisible();

  await page.evaluate(() => (location.hash = '#/new'));
  await page.getByLabel('Name', { exact: true }).fill('Studio X');
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('+40 000 000 000');
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('x@example.com');
  await page.getByRole('button', { name: 'Save the provider' }).click();
  await page.getByRole('button', { name: 'Add these details to Sample Photo Studio' }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByRole('heading', { name: 'Sample Photo Studio' })).toBeVisible();
  await expect(detail.getByRole('link', { name: 'x@example.com' })).toBeVisible();
  await page.evaluate(() => (location.hash = '#/'));
  await expect(page.locator('.provider-list .provider-name').filter({ hasText: 'Studio X' })).toHaveCount(0);
});
