import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseLanguage, toList } from './settings';

const facet = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

async function addLabel(section: Locator, en: string, extra: { color?: string; aliases?: string } = {}) {
  // The form stays open after adding, for adding several: open it only when it is closed.
  const form = section.locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  await form.getByLabel('Name', { exact: true }).fill(en);
  if (extra.color) await form.getByRole('radio', { name: extra.color }).check();
  if (extra.aliases) await form.getByLabel('Other words that find it').fill(extra.aliases);
  await form.getByRole('button', { name: 'Add the label', exact: true }).click();
}

/** A label's name as shown in its row (not the same word in a drop-down list). */
const labelText = (section: Locator, name: string) => section.locator('.label-row strong').getByText(name, { exact: true });

/** One label's Edit button, and the editor it opens. */
const edit = (section: Locator, name: string) => section.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
const editor = (section: Locator, name: string) => section.getByRole('group', { name: `Edit ${name}`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('./#/labels');
});

test('each label row shows its name, its count and one Edit button', async ({ page }) => {
  const row = facet(page, 'Category').locator('.label-row').filter({ hasText: 'Photo' });
  await expect(row).toHaveText(/Photo\s*1 provider\s*Edit/);
  await expect(row.getByRole('button')).toHaveCount(1);
});

test('adds labels in one level, and refuses a repeated name (FR-04, D-35)', async ({ page }) => {
  const categories = facet(page, 'Category');
  await addLabel(categories, 'Nuntă', { color: 'Pink' });
  await addLabel(categories, 'Portret', { aliases: 'Foto, Photographer' });
  await addLabel(categories, 'portret');
  await expect(categories.getByRole('alert')).toHaveText('That name is already used here.');
  // No place to put a label under another one.
  await expect(categories.locator('details.add-label').getByLabel('Under')).toHaveCount(0);

  await edit(categories, 'Portret');
  await expect(editor(categories, 'Portret').getByLabel('Other words that find it')).toHaveValue('Foto, Photographer');

  // The label is the owner's text, the same in any interface language (D-30); its colour shows (D-31).
  await chooseLanguage(page, 'ro');
  await expect(labelText(facet(page, 'Categorie'), 'Nuntă')).toBeVisible();
  await expect(facet(page, 'Categorie').locator('.chip[data-color="pink"]', { hasText: 'Nuntă' })).toBeVisible();
});

test('one editor renames, recolours, merges and deletes a label (FR-06, FR-08)', async ({ page }) => {
  const categories = facet(page, 'Category');
  await addLabel(categories, 'Party');
  await addLabel(categories, 'Portrait');
  await addLabel(categories, 'Video');

  await edit(categories, 'Portrait');
  await editor(categories, 'Portrait').getByLabel('Name', { exact: true }).fill('Photographer');
  await editor(categories, 'Portrait').getByRole('radio', { name: 'Teal' }).check();
  await editor(categories, 'Portrait').getByRole('button', { name: 'Save the label' }).click();
  await expect(categories.locator('.chip[data-color="teal"]', { hasText: 'Photographer' })).toBeVisible();

  await edit(categories, 'Video');
  await editor(categories, 'Video').getByLabel('Merge Video into').selectOption({ label: 'Photographer' });
  await editor(categories, 'Video').getByRole('button', { name: 'Merge' }).click();
  await expect(labelText(categories, 'Video')).toBeHidden();
  await edit(categories, 'Photographer');
  await expect(editor(categories, 'Photographer').getByLabel('Other words that find it')).toHaveValue('Video');
  await editor(categories, 'Photographer').getByRole('button', { name: 'Cancel' }).click();

  await edit(categories, 'Party');
  await editor(categories, 'Party').getByRole('button', { name: 'Delete label' }).click();
  await editor(categories, 'Party').getByRole('button', { name: 'Delete Party' }).click();
  await expect(labelText(categories, 'Party')).toBeHidden();
});

test('lists rarely used labels and adds a label group (D-15)', async ({ page }) => {
  await addLabel(facet(page, 'Area'), 'Cluj');
  await expect(page.getByRole('region', { name: 'Labels on one provider or none' })).toContainText(/Cluj\s*0 providers/);
  await page.locator('summary', { hasText: 'Add a label group' }).click();
  await page.getByLabel('Label group name').last().fill('Price band');
  await page.getByRole('button', { name: 'Add label group' }).click();
  await expect(facet(page, 'Price band')).toBeVisible();
});

test('a new label takes the colour least used now, also in another group added to just after (D-41)', async ({ page }) => {
  // The demo's labels are blue, green and orange: red is least used, then yellow.
  await addLabel(facet(page, 'Lists'), 'Call back');
  await expect(facet(page, 'Lists').locator('.chip[data-color="red"]', { hasText: 'Call back' })).toBeVisible();
  await addLabel(facet(page, 'Area'), 'Cluj');
  await expect(facet(page, 'Area').locator('.chip[data-color="yellow"]', { hasText: 'Cluj' })).toBeVisible();
});

test('"No ..." keeps the capitals of a group the owner named', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the filter column shows on wide screens');
  const add = page.locator('details.add-label').filter({ hasText: '+ Add a label group' });
  await add.locator('summary').click();
  await add.getByLabel('Label group name').fill('DJ equipment');
  await add.getByRole('button', { name: 'Add label group' }).click();
  await toList(page);
  await expect(page.getByRole('complementary', { name: 'Filters' }).getByText('No DJ equipment', { exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Filters' }).getByText('No category')).toBeVisible();
});

test('a label moves to another group and keeps its providers (FR-08)', async ({ page }) => {
  const source = facet(page, 'Source');
  await edit(source, 'Sample fair');
  const panel = editor(source, 'Sample fair');
  await panel.getByRole('combobox', { name: /^Move Sample fair to another label group/ }).selectOption({ label: 'Lists' });
  await panel.getByRole('button', { name: 'Move' }).click();
  await expect(labelText(facet(page, 'Lists'), 'Sample fair')).toBeVisible();
  await expect(facet(page, 'Lists').locator('.label-row').filter({ hasText: 'Sample fair' })).toContainText('1 provider');
  await expect(labelText(source, 'Sample fair')).toHaveCount(0);
});
