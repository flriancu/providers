import { expect, test, type Page } from '@playwright/test';
import { FakeDrive, providerNames, USER } from './fakeDrive';
import { openLabels, toList } from './settings';

/**
 * Signed in, against a fake Google Drive (fakeDrive.ts): sign-in, saving, the device copy and
 * refresh (D-24, D-25, NFR-10), sign-out, and a directory file in the trash.
 */

async function open(page: Page, drive: FakeDrive, signedIn = true) {
  await drive.attach(page, { signedIn });
  page.on('dialog', (d) => void d.accept()); // "leave the page?" while a save is pending
  await page.goto('./');
}

async function addProvider(page: Page, name: string, labels: string[] = []) {
  await toList(page);
  await page.getByRole('link', { name: 'Add a provider' }).click();
  const form = page.locator('form.provider-form');
  await form.getByLabel('Name', { exact: true }).fill(name);
  for (const l of labels) await form.getByRole('checkbox', { name: l, exact: true }).check();
  await form.getByRole('button', { name: 'Save the provider' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
}

const names = (page: Page) => page.locator('.provider-list .provider-name');
/** The header's quiet save word; not a live region, so it is not read out after every edit. */
const saved = (page: Page) => page.getByRole('banner').getByText('Saved', { exact: true });

/**
 * Category labels made here and saved; then the phone, before it synced, made its own label of
 * each name (another id, from before this one), and this page reloads.
 */
async function sameNamesOnPhone(page: Page, labelNames: string[]) {
  const drive = new FakeDrive();
  await open(page, drive);
  await openLabels(page);
  const category = page.getByRole('region', { name: 'Category', exact: true });
  const form = category.locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  for (const name of labelNames) {
    await form.getByLabel('Name', { exact: true }).fill(name);
    await form.getByRole('button', { name: 'Add the label', exact: true }).click();
  }
  await expect.poll(() => Object.values(drive.content().labels).map((l) => l.name)).toEqual(expect.arrayContaining(labelNames));
  await expect(saved(page)).toBeVisible();
  drive.change((doc) => {
    for (const name of labelNames) {
      const here = Object.values(doc.labels).find((l) => l.name === name)!;
      const id = `from-phone-${name}`;
      doc.labels[id] = { ...here, id, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    }
  });
  await page.reload();
  return category;
}

test.describe('wide screens', () => {
  test.skip(({ isMobile }) => isMobile, 'storage, not layout: one screen size is enough');

  test('signing in carries what was added in the demo into Drive, never the made-up sample (D-25)', async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive, false);
    await addProvider(page, 'Lagoo', ['Photo']); // a label of the sample's
    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(page.getByRole('status').getByText('What you added in the demo is now in your directory.')).toBeVisible();
    await toList(page);
    await expect(names(page)).toHaveText(['Lagoo']);
    await expect.poll(() => providerNames(drive.content())).toEqual(['Lagoo']);
    const labels = Object.values(drive.content().labels).map((l) => l.name);
    expect(labels).toEqual(['Photo']); // not Bucharest or Sample fair
    expect(drive.content().owner.googleSub).toBe(USER.sub);
    await expect(page.getByRole('note')).toBeHidden(); // no demo notice once signed in
  });

  test('a reload shows the copy on this device and downloads nothing while the file is unchanged (D-24, NFR-10)', async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive);
    await addProvider(page, 'Lagoo');
    await expect.poll(() => providerNames(drive.content())).toEqual(['Lagoo']);
    await expect(saved(page)).toBeVisible();

    await page.reload();
    await expect(names(page)).toHaveText(['Lagoo']);
    // A change after the reload is saved over the same version: the open never downloaded the file.
    await addProvider(page, 'Flashbox');
    await expect.poll(() => providerNames(drive.content())).toEqual(['Flashbox', 'Lagoo']);
    expect(drive.downloads).toBe(0);
  });

  test("a reload downloads the file when another device saved, and shows that device's change", async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive);
    await addProvider(page, 'Lagoo');
    await expect.poll(() => providerNames(drive.content())).toEqual(['Lagoo']);
    const lagoo = Object.values(drive.content().providers)[0]!;
    drive.change((doc) => {
      doc.providers['from-phone'] = { ...lagoo, id: 'from-phone', name: 'Flashbox', updatedAt: new Date().toISOString() };
    });

    await page.reload();
    await expect(names(page)).toHaveText(['Flashbox', 'Lagoo']);
    expect(drive.downloads).toBe(1);
  });

  test('a label of the same name made on another device becomes one with this one, and the page says so (D-47)', async ({ page }) => {
    const category = await sameNamesOnPhone(page, ['Film']);
    const notice = page.getByRole('status').filter({ hasText: 'No provider lost a label.' });
    await expect(notice).toContainText(
      'You had two “Film” labels in the “Category” group, each from a different device. They are now one label. No provider lost a label. You don’t need to do anything.',
    );
    await expect(category.locator('.label-row strong').getByText('Film', { exact: true })).toHaveCount(1);
    await notice.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toBeHidden();
  });

  test('several labels that became one at once are listed, one per line (D-47)', async ({ page }) => {
    await sameNamesOnPhone(page, ['Film', 'Drone']);
    const notice = page.getByRole('status').filter({ hasText: 'No provider lost a label.' });
    await expect(notice.getByRole('listitem')).toHaveText(['“Film” in the “Category” group', '“Drone” in the “Category” group'], {
      useInnerText: true,
    });
    await expect(notice).toContainText('No provider lost a label. You don’t need to do anything.');
  });

  test('a failed save says so and keeps the change; "Try again" saves it', async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive);
    await expect(saved(page)).toBeVisible();
    drive.failWrites = 1000;
    await addProvider(page, 'Lagoo');
    // An alert under the header says why, where the change is, and offers to try again.
    await expect(saved(page)).toBeHidden();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('The last change is not saved in Google Drive yet.');
    await expect(alert).toContainText('Your changes are kept on this device');
    const retry = alert.getByRole('button', { name: 'Try again' });
    drive.failWrites = 0;
    await retry.click();
    await expect(saved(page)).toBeVisible();
    await expect(alert).toBeHidden();
    expect(providerNames(drive.content())).toEqual(['Lagoo']);
  });

  test('when this device has no room for its copy, a failed save says the change is only in the page', async ({ page }) => {
    // The browser refuses the device copy, as it does once the directory outgrows its quota.
    await page.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes('.replica.')) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        setItem.call(this, key, value);
      };
    });
    const drive = new FakeDrive();
    await open(page, drive);
    await expect(saved(page)).toBeVisible();
    drive.failWrites = 1000;
    await addProvider(page, 'Lagoo');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('The last change is not saved in Google Drive yet.');
    await expect(alert).toContainText('closing or reloading it loses them');
    await expect(alert).not.toContainText('kept on this device');
  });

  test('signing out with a form not saved asks first, and Keep editing keeps it', async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive);
    await expect(saved(page)).toBeVisible();
    await page.getByRole('link', { name: 'Add a provider' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Half typed');
    await page.getByLabel('Account: ana@example.test').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByText('A provider form has changes that are not saved. Signing out discards them.')).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Half typed');
    await page.getByLabel('Account: ana@example.test').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Sign out and discard them' }).click();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });

  test('signing out removes the copy on this device and goes back to the demo (D-24)', async ({ page }) => {
    const drive = new FakeDrive();
    await open(page, drive);
    await addProvider(page, 'Lagoo');
    await expect(saved(page)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('providers-directory.replica.u1'))).toContain('Lagoo');

    const menu = page.getByLabel('Account: ana@example.test');
    const where = page.getByText('Your directory is the file providers-directory.json in your Google Drive.');
    await menu.click();
    await expect(where).toBeVisible();
    await page.keyboard.press('Escape'); // closes the menu, back on its button
    await expect(where).toBeHidden();
    await expect(menu).toBeFocused();
    await menu.click();
    // Signed in, the language is chosen in this menu; the header has no language box.
    await expect(page.getByRole('banner').locator('> .lang')).toHaveCount(0);
    await page.getByLabel('Language').selectOption('ro');
    await expect(page.getByRole('button', { name: 'Deconectare' })).toBeVisible(); // the menu stays open
    await page.getByLabel('Limba').selectOption('en');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await toList(page);
    await expect(names(page)).toHaveText(['Sample Photo Studio']);
    expect(await page.evaluate(() => localStorage.getItem('providers-directory.replica.u1'))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('providers-directory.session'))).toBeNull();
  });

  test('a directory file in the Drive trash is not covered over by an empty one, unless asked', async ({ page }) => {
    const drive = new FakeDrive();
    drive.seed(
      {
        schemaVersion: 1,
        owner: { googleSub: USER.sub },
        facets: {},
        labels: {},
        providers: {},
        log: {},
        shares: {},
        settings: { updatedAt: '2026-11-01T00:00:00.000Z' },
      },
      true,
    );
    await open(page, drive);
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Your directory file is in the Google Drive trash.');
    expect(drive.files.size).toBe(1);
    await alert.getByRole('button', { name: 'Start a new directory' }).click();
    await expect(page.getByText('There are no providers yet.')).toBeVisible();
    expect(drive.files.size).toBe(2);
  });
});

test('signed in, the header fits a narrow phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page, new FakeDrive());
  await expect(saved(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBe(0);
});

test('while signing out waits for the last save, the page says so and offers nothing to edit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'storage, not layout');
  const drive = new FakeDrive();
  await open(page, drive);
  await expect(saved(page)).toBeVisible();
  let release!: () => void;
  drive.holdWrites = new Promise<void>((r) => (release = r));
  await addProvider(page, 'Lagoo');
  await page.getByLabel('Account: ana@example.test').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('Signing out: saving the last changes to Google Drive first…')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add a provider' })).toHaveCount(0);
  release();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  expect(providerNames(drive.content())).toEqual(['Lagoo']);
});

test('signed in, the export says the whole directory is already in Google Drive, and not to change the file (D-50)', async ({ page }) => {
  await open(page, new FakeDrive());
  await expect(saved(page)).toBeVisible();
  await page.getByRole('link', { name: 'Import or export' }).click();
  const exportSection = page.getByRole('region', { name: 'Export to a CSV file' });
  await expect(exportSection).toContainText('Your whole directory is already saved in your Google Drive');
  await expect(exportSection).toContainText('Do not change the file to update your providers');
});
