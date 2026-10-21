const { test, expect } = require('@playwright/test');

test('Bookmarks opent en toont bookmarkgroepen', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: /^(Mijn|My) Bookmarks$/ })
  ).toBeVisible();
  await expect(page.locator('#container .group').first()).toBeVisible();
});
