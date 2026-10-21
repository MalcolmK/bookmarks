const { test, expect } = require('@playwright/test');

const smallViewports = [
  { width: 390, height: 568 },
  { width: 320, height: 568 }
];

for (const viewport of smallViewports) {
  test(`houdt de instellingen bruikbaar op ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const openButton = page.getByRole('button', { name: 'Instellingen' });
    const dialog = page.locator('#settings-dialog');
    const scrollArea = dialog.locator('.settings-dialog-scroll-area');
    const closeButton = dialog.getByRole('button', { name: 'Instellingen sluiten' });
    const lastControl = dialog.locator('#changelog-enabled');

    await openButton.click();
    await expect(dialog).toBeVisible();

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);

    await expect.poll(() => scrollArea.evaluate(element => (
      element.scrollHeight > element.clientHeight
    ))).toBe(true);

    await lastControl.scrollIntoViewIfNeeded();
    await expect(lastControl).toBeInViewport();
    await expect.poll(() => scrollArea.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

    await closeButton.scrollIntoViewIfNeeded();
    await expect(closeButton).toBeInViewport();
    await closeButton.click();

    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });
}
