import { expect, test, type Locator, type Page } from '@playwright/test';
import { PATH_SEPARATOR } from '../../src/ui/labelText';

const facet = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

async function addLabel(section: Locator, en: string, extra: { color?: string; aliases?: string; under?: string } = {}) {
  // The form stays open after adding, for adding several: open it only when it is closed.
  const form = section.locator('details.add-label');
  if ((await form.getAttribute('open')) === null) await form.locator('summary').click();
  await form.getByLabel('Name', { exact: true }).fill(en);
  if (extra.color) await form.getByRole('radio', { name: extra.color }).check();
  if (extra.aliases) await form.getByLabel('Other words that find it').fill(extra.aliases);
  if (extra.under) await form.getByLabel('Under').selectOption({ label: extra.under });
  await form.getByRole('button', { name: 'Add', exact: true }).click();
}

/** A label's name as shown in its row (not the same word in a drop-down list). */
const labelText = (section: Locator, name: string) => section.locator('.label-row strong').getByText(name, { exact: true });

/** One label's Edit button, and the editor it opens. */
const edit = (section: Locator, name: string) => section.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
const editor = (section: Locator, name: string) => section.getByRole('group', { name: `Edit ${name}`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('./#/labels');
  await page.getByLabel('Language').selectOption('en');
});

test('each label row shows its name, its count and one Edit button', async ({ page }) => {
  const row = facet(page, 'Category').locator('.label-row').filter({ hasText: 'Wedding' });
  await expect(row).toHaveText(/Wedding\s*1 provider\s*Edit/);
  await expect(row.getByRole('button')).toHaveCount(1);
});

test('adds labels in two levels, and refuses a third level and a repeated name (FR-04)', async ({ page }) => {
  const categories = facet(page, 'Category');
  await addLabel(categories, 'Nuntă', { color: 'Pink' });
  await addLabel(categories, 'Portret', { under: 'Nuntă', aliases: 'Foto, Photographer' });
  await addLabel(categories, 'Portret', { under: 'Nuntă' });
  await expect(categories.getByRole('alert')).toHaveText('That name is already used here.');
  // Portret is a sub-label, so it is not offered as a parent: two levels at most.
  const parents = await categories.locator('details.add-label').getByLabel('Under').getByRole('option').allTextContents();
  expect(parents).toContain('Nuntă');
  expect(parents).not.toContain('Portret');

  await edit(categories, 'Portret');
  await expect(editor(categories, 'Portret').getByLabel('Other words that find it')).toHaveValue('Foto, Photographer');

  // The label is the owner's text, the same in any interface language (D-30); its colour shows (D-31).
  await page.getByLabel('Language').selectOption('ro');
  await expect(labelText(facet(page, 'Categorie'), 'Nuntă')).toBeVisible();
  await expect(facet(page, 'Categorie').locator('.chip[data-color="pink"]', { hasText: 'Nuntă' })).toBeVisible();
});

test('one editor renames, recolours, moves, merges and deletes a label (FR-06, FR-08)', async ({ page }) => {
  const categories = facet(page, 'Category');
  await addLabel(categories, 'Party');
  await addLabel(categories, 'Portrait', { under: 'Party' });
  await addLabel(categories, 'Video');

  await edit(categories, 'Video');
  await editor(categories, 'Video').getByLabel('Under').selectOption({ label: 'Party' });
  await editor(categories, 'Video').getByRole('button', { name: 'Save' }).click();
  await expect(categories.locator('li.child .label-row').filter({ hasText: 'Video' })).toBeVisible();

  await edit(categories, 'Portrait');
  await editor(categories, 'Portrait').getByLabel('Name', { exact: true }).fill('Photographer');
  await editor(categories, 'Portrait').getByRole('radio', { name: 'Teal' }).check();
  await editor(categories, 'Portrait').getByRole('button', { name: 'Save' }).click();
  await expect(categories.locator('.chip[data-color="teal"]', { hasText: 'Photographer' })).toBeVisible();

  await edit(categories, 'Video');
  await editor(categories, 'Video')
    .getByLabel('Merge Video into')
    .selectOption({ label: `Party${PATH_SEPARATOR}Photographer` });
  await editor(categories, 'Video').getByRole('button', { name: 'Merge' }).click();
  await expect(labelText(categories, 'Video')).toBeHidden();
  await edit(categories, 'Photographer');
  await expect(editor(categories, 'Photographer').getByLabel('Other words that find it')).toHaveValue('Video');
  await editor(categories, 'Photographer').getByRole('button', { name: 'Cancel' }).click();

  await edit(categories, 'Party');
  await editor(categories, 'Party').getByRole('button', { name: 'Delete label' }).click();
  await editor(categories, 'Party').getByRole('button', { name: 'Delete Party' }).click();
  await expect(categories.getByRole('alert')).toHaveText('Move or delete its sub-labels first.');
});

test('lists rarely used labels and adds a facet (D-15)', async ({ page }) => {
  await addLabel(facet(page, 'Area'), 'Cluj');
  await expect(page.getByRole('region', { name: 'Labels on one provider or none' })).toContainText(/Cluj\s*0 providers/);
  await page.locator('summary', { hasText: 'Add a facet' }).click();
  await page.getByLabel('Facet name').last().fill('Price band');
  await page.getByRole('button', { name: 'Add facet' }).click();
  await expect(facet(page, 'Price band')).toBeVisible();
});
