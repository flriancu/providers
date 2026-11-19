import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

/** Import and export (FR-21..24), on the demo with its Sample Photo Studio. */

async function openData(page: Page) {
  await page.goto('./');
  await page.getByRole('link', { name: 'Import or export' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Import and export' })).toBeVisible();
}

async function chooseCsv(page: Page, csv: string) {
  await page.getByLabel('Choose a CSV file').setInputFiles({ name: 'vendors.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
}

test('exports every provider to a CSV file with every field and label group (FR-22)', async ({ page }) => {
  await openData(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export the provider' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^providers-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Name,Contact person,Phones,Emails,Links,Address,Notes,Main category,Category,Area,Source,Lists');
  // A value starting with + would open as a formula: it is written as text, with an apostrophe.
  expect(text).toContain(`Sample Photo Studio,Ana Example,"'+40 000 000 000"`);
});

test('in the demo, the export makes no claim about Google Drive, and says not to change the file (D-50)', async ({ page }) => {
  await openData(page);
  const exportSection = page.getByRole('region', { name: 'Export to a CSV file' });
  await expect(exportSection).toContainText('You can keep the file, or use it in another program.');
  await expect(exportSection).not.toContainText('Google Drive');
  await expect(exportSection).toContainText('Do not change the file to update your providers');
});

test('previews an import, waits for a choice on a possible duplicate, then merges and adds (FR-21, FR-23, FR-24)', async ({ page }) => {
  await openData(page);
  await chooseCsv(
    page,
    'Name;Phones;Notes;Area;Source\n' +
      'Sample Studio;+40 000 000 000;Met at the fair;Bucharest;AllWeddings Fest 2026\n' +
      'Lagoo;0721 111 222;;Cluj;AllWeddings Fest 2026\n' +
      ';0700 000 000;;;\n',
  );
  const preview = page.getByLabel('What importing vendors.csv would do');
  await expect(preview).toContainText(
    '3 rows: 1 to add, 1 to decide (they look like a provider already here or an earlier row), 1 without a name.',
  );
  await expect(preview).toContainText('The import creates 2 labels:');
  await expect(preview.locator('.doubt-why')).toContainText('Looks like Sample Photo Studio, already in the directory (same phone).');
  // What a merge would change, one line per value: here, one label added (Bucharest is there already).
  const changes = preview.locator('.merge-diff > .diff-lines > li');
  await expect(changes).toHaveCount(1);
  await expect(changes.locator('.diff-field')).toHaveText('Label');
  await expect(changes.locator('.diff-add')).toContainText('AllWeddings Fest 2026');
  const run = preview.getByRole('button', { name: 'Choose for 1 row first' });
  await expect(run).toBeDisabled();

  // The row's full contents wait behind Details.
  const details = preview.getByRole('button', { name: 'Details of Sample Studio' });
  await expect(preview.getByText('Met at the fair')).toBeHidden();
  await details.click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(preview.getByText('Met at the fair')).toBeVisible();

  const choice = preview.getByRole('group', { name: 'What to do with Sample Studio' });
  await expect(choice.getByRole('radio')).toHaveCount(3);
  await choice.getByRole('radio', { name: 'Merge' }).check();
  await preview.getByRole('radio', { name: /Use “Met at the fair” from the file/ }).check();
  // The note chosen from the file replaces the provider's: struck through, then added.
  await expect(changes).toHaveCount(2);
  const notes = changes.filter({ has: page.locator('.diff-field', { hasText: 'Notes' }) });
  await expect(notes.locator('del.diff-del')).toContainText('A made-up provider');
  await expect(notes.locator('.diff-add')).toContainText('Met at the fair');
  // What the merge leaves alone waits behind a toggle.
  await preview.locator('.diff-kept > summary').click();
  await expect(preview.locator('.diff-kept')).toContainText('Ana Example');
  await preview.getByRole('button', { name: 'Import 2 providers' }).click();
  await expect(page.getByText('Imported: 1 provider added, 1 provider merged, 1 row left out; 2 labels created.')).toBeVisible();

  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.locator('.provider-list .provider-name')).toHaveText(['Lagoo', 'Sample Photo Studio']);
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByText('Met at the fair')).toBeVisible();
  await expect(detail.getByText('AllWeddings Fest 2026', { exact: true })).toBeVisible();
});

test('updates several providers from a file in one click: rows merged into the providers with the same name', async ({ page }) => {
  await openData(page);
  await chooseCsv(page, 'Name\nLagoo\n'); // no category yet, as the exhibitors without one
  await page.getByRole('button', { name: 'Import 1 provider' }).click();
  await chooseCsv(page, 'Name,Main category,Category\nSample Photo Studio,Foto,Foto\nLagoo,Locatii,Locatii\n');
  const preview = page.getByLabel('What importing vendors.csv would do');
  await expect(preview.locator('.doubt-why').first()).toHaveText('Already in the directory (same name). ▸ Details');
  await preview.getByRole('button', { name: 'Merge 2 rows into the provider with the same name' }).click();

  // The decided rows fold into one line, which takes the focus from the button that went away.
  const fold = preview.locator('.import-fold > summary');
  await expect(fold).toHaveText('2 rows to merge into the provider with the same name');
  await expect(fold).toBeFocused();
  await expect(preview.getByRole('radio', { name: 'Merge' }).first()).toBeHidden();

  // Opened, a row can still be changed, and it stays in the folded group.
  await fold.click();
  await preview.getByRole('group', { name: 'What to do with Lagoo' }).getByRole('radio', { name: 'Leave out' }).check();
  await expect(fold).toHaveText('1 row to merge into the provider with the same name and 1 row to leave out');
  await expect(preview.getByRole('group', { name: 'What to do with Lagoo' })).toBeVisible();
  await preview.getByRole('group', { name: 'What to do with Lagoo' }).getByRole('radio', { name: 'Merge' }).check();

  await preview.getByRole('button', { name: 'Import 2 providers' }).click();
  await expect(page.getByText('Imported: 0 providers added, 2 providers merged, 0 rows left out; 2 labels created.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  const lagoo = page.locator('.provider-list li').filter({ hasText: 'Lagoo' });
  await expect(lagoo.locator('.chip').first()).toHaveText('Locatii'); // the main category first
});

test('a file that repeats a name merges both rows into that provider, in one click', async ({ page }) => {
  await openData(page);
  await chooseCsv(page, 'Name\nLagoo\n');
  await page.getByRole('button', { name: 'Import 1 provider' }).click();
  await chooseCsv(page, 'Name,Phones\nLagoo,0721 111 111\nLagoo,0722 222 222\n');
  const preview = page.getByLabel('What importing vendors.csv would do');
  await preview.getByRole('button', { name: 'Merge 2 rows into the provider with the same name' }).click();
  await preview.getByRole('button', { name: 'Import 2 providers' }).click();
  await expect(page.getByText('Imported: 0 providers added, 2 providers merged, 0 rows left out; 0 labels created.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the list' }).click();
  await page.getByRole('link', { name: /Lagoo/ }).click();
  await expect(page.getByRole('article').getByRole('link', { name: '0721 111 111' })).toBeVisible();
  await expect(page.getByRole('article').getByRole('link', { name: '0722 222 222' })).toBeVisible();
});

test('the rows still to decide can all be added, or all left out, at once', async ({ page }) => {
  await openData(page);
  await chooseCsv(page, 'Name,Phones\nOne,+40 000 000 000\nTwo,+40 000 000 000\n'); // both share the sample's phone
  const preview = page.getByLabel('What importing vendors.csv would do');
  await preview.getByRole('button', { name: 'Add the 2 rows still to decide as new providers' }).click();
  const fold = preview.locator('.import-fold > summary');
  await expect(fold).toHaveText('2 rows to add alongside the provider already here');
  await expect(fold).toBeFocused();
  await chooseCsv(page, 'Name,Phones\nOne,+40 000 000 000\nTwo,+40 000 000 000\n');
  await preview.getByRole('button', { name: 'Leave out the 2 rows still to decide' }).click();
  await expect(fold).toHaveText('2 rows to leave out');
});

test('"Merge all" leaves out a repeated row that also looks like a row being added separately', async ({ page }) => {
  await openData(page);
  await chooseCsv(page, 'Name\nLagoo\n');
  await page.getByRole('button', { name: 'Import 1 provider' }).click();
  // Line 4 repeats Lagoo by name, and shares a phone with line 3, which is a new provider.
  await chooseCsv(page, 'Name,Phones\nLagoo,\nNew One,0700 000 001\nLagoo,0700 000 001\nSample Photo Studio,\n');
  const preview = page.getByLabel('What importing vendors.csv would do');
  await expect(preview.getByRole('button', { name: 'Merge 2 rows into the provider with the same name' })).toBeVisible();
  await expect(preview.getByRole('button', { name: /^Merge 3 rows/ })).toHaveCount(0);
});

/** A CSV value in quotes, its own quotes doubled. */
const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;

/** A made-up file of `count` providers, each with every field and a label in three groups. */
function largeFile(count: number) {
  const categories = [
    'Fotografie',
    'Videografie',
    'Locații',
    'Muzică',
    'Flori și decor',
    'Rochii de mireasă',
    'Costume miri',
    'Tort și dulciuri',
    'Invitații',
    'Lumini și sunet',
  ];
  const areas = ['Sibiu', 'Oradea', 'Constanța', 'Craiova', 'Suceava'];
  const lines = ['Name,Contact person,Phones,Emails,Links,Address,Notes,Main category,Category,Area,Source'];
  for (let i = 1; i <= count; i++) {
    const n = String(i).padStart(3, '0');
    const category = categories[i % categories.length]!;
    lines.push(
      [
        `Furnizor ${n}`,
        `Persoană ${n}`,
        `"0700 000 ${n}; 0711 111 ${n}"`,
        `furnizor${n}@example.org`,
        `https://example.org/furnizor-${n}`,
        quote(`Strada Mare ${i}, ${areas[i % areas.length]}`),
        // Commas, quotes and a line break inside a value.
        quote(`Văzut la târg, standul ${i}.\nA spus: "sunați după ora 10".`),
        category,
        category,
        areas[i % areas.length],
        'Târg 2026',
      ].join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

test('imports a file of 300 providers, and its export imports back as 300 look-alikes', async ({ page }) => {
  await openData(page);
  // The preview has the expect timeout (5 seconds) to show the whole file.
  await chooseCsv(page, largeFile(300));
  const preview = page.getByLabel('What importing vendors.csv would do');
  await expect(preview).toContainText('300 rows: 300 to add.');
  // 10 categories, 5 areas, 1 source.
  await expect(preview).toContainText('The import creates 16 labels:');
  await preview.getByRole('button', { name: 'Import 300 providers' }).click();
  await expect(page.getByText('Imported: 300 providers added, 0 providers merged, 0 rows left out; 16 labels created.')).toBeVisible();

  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.locator('.provider-list .provider-name')).toHaveCount(301);
  await page.getByRole('link', { name: /Furnizor 150/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByRole('link', { name: '0711 111 150' })).toBeVisible();
  await expect(detail.getByText('A spus: "sunați după ora 10".')).toBeVisible();
  await expect(detail.getByText('Fotografie', { exact: true }).first()).toBeVisible();
  await expect(detail.getByText('Sibiu', { exact: true })).toBeVisible();
  await expect(detail.getByText('Târg 2026', { exact: true })).toBeVisible();

  // The whole directory out and in again: every row is a look-alike, and no label is new. Within
  // the app: a reload would start the demo afresh.
  await page.goBack();
  await page.getByRole('link', { name: 'Import or export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export all 301 providers' }).click(),
  ]);
  await page.getByLabel('Choose a CSV file').setInputFiles(await download.path());
  await expect(page.getByLabel(/^What importing /)).toContainText('301 rows: 301 to decide');
  await expect(page.getByText(/^The import creates/)).toHaveCount(0);
});
