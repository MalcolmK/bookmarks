const { test, expect } = require('@playwright/test');

test.describe('Instellingen, taal en thema', () => {
  test('verandert de taal naar Engels en bewaart die na herladen', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Mijn Bookmarks', exact: true })
    ).toBeVisible();

    await page.locator('#toggle-settings').click();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await expect(page.locator('#language-select')).toHaveValue('nl');

    await page.locator('#language-select').selectOption('en');

    await expect(page.locator('#language-select')).toHaveValue('en');
    await expect(
      page.getByRole('heading', { name: 'My Bookmarks', exact: true })
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole('heading', { name: 'My Bookmarks', exact: true })
    ).toBeVisible();
    await page.locator('#toggle-settings').click();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await expect(page.locator('#language-select')).toHaveValue('en');
  });

  test('opent en sluit de instellingen met het toetsenbord', async ({ page }) => {
    await page.goto('/');

    const openButton = page.locator('#toggle-settings');
    const dialog = page.locator('#settings-dialog');
    const closeButton = page.locator('#settings-close');

    await openButton.focus();
    await page.keyboard.press('Enter');

    await expect(dialog).toBeVisible();
    await expect(openButton).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => dialog.evaluate(element => (
      element === document.activeElement || element.contains(document.activeElement)
    ))).toBe(true);

    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await expect(openButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();

    await closeButton.focus();
    await page.keyboard.press('Space');

    await expect(dialog).toBeHidden();
    await expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await expect(openButton).toBeFocused();
  });

  test('sluit de instellingen met de sluitknop en herstelt de focus', async ({ page }) => {
    await page.goto('/');

    const openButton = page.locator('#toggle-settings');
    const dialog = page.locator('#settings-dialog');
    const closeButton = page.locator('#settings-close');

    await openButton.click();
    await expect(dialog).toBeVisible();
    await expect(openButton).toHaveAttribute('aria-expanded', 'true');

    await closeButton.click();

    await expect(dialog).toBeHidden();
    await expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await expect(openButton).toBeFocused();
  });

  test('sluit eerst een geopende instellingentooltip met Escape', async ({ page }) => {
    await page.goto('/');

    const openButton = page.locator('#toggle-settings');
    const dialog = page.locator('#settings-dialog');
    const helpButton = page.getByRole('button', {
      name: 'Uitleg over snelheid van eerste weergave'
    });
    const tooltip = page.locator('#bookmark-intro-speed-help');

    await openButton.click();
    await expect(dialog).toBeVisible();

    await helpButton.click();
    await expect(helpButton).toHaveAttribute('aria-expanded', 'true');
    await expect(tooltip).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(helpButton).toHaveAttribute('aria-expanded', 'false');
    await expect(tooltip).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(openButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('past een opgeslagen thema toe en behoudt het na herladen', async ({ page }) => {
    await page.goto('/');

    const pageRoot = page.locator('html');
    await expect(pageRoot).toHaveAttribute('data-theme', 'ocean');

    await page.evaluate(() => {
      localStorage.setItem('antons-theme-v2', 'midnight');
    });

    await page.reload();
    await expect(pageRoot).toHaveAttribute('data-theme', 'midnight');

    await page.reload();
    await expect(pageRoot).toHaveAttribute('data-theme', 'midnight');
  });
});
