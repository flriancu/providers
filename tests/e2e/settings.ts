import type { Page } from '@playwright/test';

/**
 * Opens the header menu that holds the settings (Settings when signed out, the account menu when
 * signed in), runs `pick` in it, then closes it with Escape.
 */
async function inSettings(page: Page, pick: (menu: ReturnType<Page['locator']>) => Promise<unknown>) {
  await page.locator('details.account-menu > summary').click();
  await pick(page.locator('details.account-menu[open] .menu-panel'));
  await page.keyboard.press('Escape');
}

/** The interface language, from the header menu; the label is read in either language. */
export const chooseLanguage = (page: Page, lang: 'en' | 'ro') =>
  inSettings(page, (menu) => menu.getByLabel(/^(Language|Limba)/).selectOption(lang));

/** The theme (D-36), from the header menu. */
export const chooseTheme = (page: Page, theme: 'device' | 'light' | 'dark') =>
  inSettings(page, (menu) => menu.getByLabel(/^(Theme|Temă)/).selectOption(theme));
