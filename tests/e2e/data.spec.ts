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
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export all 1 provider' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^providers-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Name,Contact person,Phones,Emails,Links,Address,Notes,Main category,Category,Area,Source,Lists');
  expect(text).toContain('Sample Photo Studio,Ana Example,+40 000 000 000');
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
  await expect(preview.getByText('Looks like Sample Photo Studio, already in the directory (same phone).')).toBeVisible();
  const run = preview.getByRole('button', { name: 'Choose for 1 row first' });
  await expect(run).toBeDisabled();

  await preview.getByRole('radio', { name: 'Merge into Sample Photo Studio' }).check();
  await preview.getByRole('radio', { name: /Use “Met at the fair” from the file/ }).check();
  await preview.getByRole('button', { name: 'Import 2 providers' }).click();
  await expect(page.getByText('Imported: 1 provider added, 1 provider merged, 1 row left out; 2 labels created.')).toBeVisible();

  await page.getByRole('link', { name: 'Back to the list' }).click();
  await expect(page.locator('.provider-list .provider-name')).toHaveText(['Lagoo', 'Sample Photo Studio']);
  await page.getByRole('link', { name: /Sample Photo Studio/ }).click();
  const detail = page.getByRole('article');
  await expect(detail.getByText('Met at the fair')).toBeVisible();
  await expect(detail.getByText('AllWeddings Fest 2026', { exact: true })).toBeVisible();
});
