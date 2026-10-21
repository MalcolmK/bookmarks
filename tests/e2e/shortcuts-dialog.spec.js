const { test, expect } = require('@playwright/test');

test.describe('Sneltoetsendialoog', () => {
  test('opent via de knop en sluit via de sluitknop', async ({ page }) => {
    await page.goto('/');

    const openButton = page.getByRole('button', {
      name: 'Toetsenbordsneltoetsen tonen'
    });
    await openButton.click();

    const dialog = page.getByRole('dialog', {
      name: 'Toetsenbordsneltoetsen'
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', {
      name: 'Toetsenbordsneltoetsen'
    })).toBeVisible();

    await dialog.getByRole('button', { name: 'Sluiten' }).click();

    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });

  test('opent en sluit met ?, en sluit ook met Escape', async ({ page }) => {
    await page.goto('/');

    const openButton = page.getByRole('button', {
      name: 'Toetsenbordsneltoetsen tonen'
    });
    const dialog = page.getByRole('dialog', {
      name: 'Toetsenbordsneltoetsen'
    });

    await openButton.focus();
    await page.keyboard.press('?');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();

    await page.keyboard.press('?');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('?');
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });
});
